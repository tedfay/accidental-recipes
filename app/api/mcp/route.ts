import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * API route that bridges the Next.js frontend to the Biga-MCP server.
 *
 * Spawns the MCP server as a child process using stdio transport, sends
 * a JSON-RPC request, collects the response, and returns the parsed
 * tool result to the caller.
 *
 * This is the local dev transport. Production transport is unresolved
 * (2FI-100). Do not assume HTTP MCP transport is available.
 */

// Path to the built MCP server entry point
const MCP_SERVER_PATH =
  process.env['MCP_SERVER_PATH'] ??
  join(process.cwd(), '..', '..', 'Biga', 'Biga-MCP', 'dist', 'index.js');

if (!existsSync(MCP_SERVER_PATH)) {
  console.error(
    `[MCP bridge] Server not found at ${MCP_SERVER_PATH}.\n` +
      `Run "npm run build" in Biga-MCP/ first.`,
  );
}

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

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as McpRequest;
  const { tool, args = {} } = body;

  if (!tool) {
    return NextResponse.json({ error: 'Missing tool name' }, { status: 400 });
  }

  if (!existsSync(MCP_SERVER_PATH)) {
    return NextResponse.json(
      { error: `MCP server not found at ${MCP_SERVER_PATH}. Run "npm run build" in Biga-MCP/.` },
      { status: 500 },
    );
  }

  try {
    const result = await callMcpTool(tool, args);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * MCP stdio protocol sequence:
 *   1. Client sends `initialize` request
 *   2. Server responds with capabilities
 *   3. Client sends `initialized` notification (no id, no response)
 *   4. Client sends `tools/call` request
 *   5. Server responds with tool result
 *   6. Client kills the process (no persistent connection in this bridge)
 */
async function callMcpTool(
  tool: string,
  args: Record<string, unknown>,
): Promise<unknown> {
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
