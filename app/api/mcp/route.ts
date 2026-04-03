import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * API route that bridges the Next.js frontend to the Biga-MCP server.
 *
 * Two modes:
 *   1. HTTP mode (production): MCP_SERVER_URL is set — sends JSON-RPC
 *      requests to the remote MCP server over HTTP.
 *   2. stdio mode (local dev): spawns the MCP server as a child process
 *      using stdio transport.
 *
 * The frontend always calls this route at /api/mcp. The bridge decides
 * which transport to use based on environment variables.
 */

// ─── HTTP mode config ────────────────────────────────────────────────────────

const MCP_SERVER_URL = process.env['MCP_SERVER_URL']; // e.g. https://biga-mcp.up.railway.app/mcp

// ─── stdio mode config ──────────────────────────────────────────────────────

const MCP_SERVER_PATH =
  process.env['MCP_SERVER_PATH'] ??
  join(process.cwd(), '..', '..', 'Biga', 'Biga-MCP', 'dist', 'index.js');

if (!MCP_SERVER_URL && !existsSync(MCP_SERVER_PATH)) {
  console.error(
    `[MCP bridge] No MCP_SERVER_URL set and server not found at ${MCP_SERVER_PATH}.\n` +
      `Set MCP_SERVER_URL for production or run "npm run build" in Biga-MCP/ for local dev.`,
  );
}

// ─── Shared types ────────────────────────────────────────────────────────────

interface McpRequest {
  tool: string;
  args?: Record<string, unknown>;
}

interface JsonRpcResponse {
  result?: {
    content?: { type: string; text: string }[];
  };
  error?: { message: string };
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as McpRequest;
  const { tool, args = {} } = body;

  if (!tool) {
    return NextResponse.json({ error: 'Missing tool name' }, { status: 400 });
  }

  try {
    const result = MCP_SERVER_URL
      ? await callMcpToolHttp(tool, args)
      : await callMcpToolStdio(tool, args);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── HTTP transport (production) ─────────────────────────────────────────────

/**
 * Calls the remote MCP server's direct /tools/call endpoint.
 * This bypasses the MCP JSON-RPC handshake (initialize/initialized)
 * which doesn't work in stateless mode where each request creates
 * a fresh server instance. The /tools/call endpoint dispatches
 * directly to tool functions and returns JSON.
 */
async function callMcpToolHttp(
  tool: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  // MCP_SERVER_URL points to .../mcp — replace with /tools/call
  const baseUrl = MCP_SERVER_URL!.replace(/\/mcp$/, '');
  const res = await fetch(`${baseUrl}/tools/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool, args }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MCP tools/call failed: ${res.status} ${res.statusText}: ${body}`);
  }

  return res.json();
}

// ─── stdio transport (local dev) ─────────────────────────────────────────────

/**
 * MCP stdio protocol sequence:
 *   1. Client sends `initialize` request
 *   2. Server responds with capabilities
 *   3. Client sends `initialized` notification (no id, no response)
 *   4. Client sends `tools/call` request
 *   5. Server responds with tool result
 *   6. Client kills the process (no persistent connection in this bridge)
 */
async function callMcpToolStdio(
  tool: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  if (!existsSync(MCP_SERVER_PATH)) {
    throw new Error(
      `MCP server not found at ${MCP_SERVER_PATH}. Run "npm run build" in Biga-MCP/.`,
    );
  }

  return new Promise((resolve, reject) => {
    const child = spawn('node', [MCP_SERVER_PATH], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    let buffer = '';
    let stderr = '';
    let phase: 'init' | 'tool' = 'init';

    const timeout = setTimeout(() => {
      child.kill();
      reject(
        new Error(
          `MCP server timed out after 10s (phase: ${phase}).` +
            (stderr ? ` stderr: ${stderr.slice(0, 500)}` : ''),
        ),
      );
    }, 10_000);

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.stdout.on('data', (data: Buffer) => {
      buffer += data.toString();

      // Process complete JSON-RPC messages (one per line)
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('{')) continue;

        try {
          const msg = JSON.parse(trimmed) as JsonRpcResponse & { id?: number };

          if (phase === 'init' && msg.id === 1) {
            // Got initialize response — send initialized notification + tool call
            phase = 'tool';
            child.stdin.write(
              JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n',
            );
            child.stdin.write(
              JSON.stringify({
                jsonrpc: '2.0',
                id: 2,
                method: 'tools/call',
                params: { name: tool, arguments: args },
              }) + '\n',
            );
          } else if (phase === 'tool' && msg.id === 2) {
            // Got tool response — extract result and kill the process
            clearTimeout(timeout);

            if (msg.error) {
              child.kill();
              reject(new Error(msg.error.message));
              return;
            }

            const textContent = msg.result?.content?.find(
              (c) => c.type === 'text',
            );
            if (textContent) {
              child.kill();
              try {
                resolve(JSON.parse(textContent.text));
              } catch {
                resolve(textContent.text);
              }
              return;
            }

            child.kill();
            reject(new Error('Tool response had no text content'));
            return;
          }
        } catch {
          // Skip non-JSON lines
        }
      }
    });

    // Send initialize request to start the handshake
    child.stdin.write(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'accidental-recipes', version: '0.1.0' },
        },
      }) + '\n',
    );

    child.on('close', () => {
      clearTimeout(timeout);
      reject(
        new Error(
          `MCP server exited during ${phase} phase without responding.` +
            (stderr ? ` stderr: ${stderr.slice(0, 500)}` : ''),
        ),
      );
    });
  });
}
