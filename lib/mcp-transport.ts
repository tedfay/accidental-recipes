import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Shared MCP transport layer.
 *
 * Two modes:
 *   - MCP_SERVER_URL set (production): HTTP POST to Railway /tools/call
 *   - MCP_SERVER_URL not set (local dev): stdio child process spawn
 *
 * Used by both:
 *   - lib/mcp-client.ts (server component calls)
 *   - app/api/mcp/route.ts (browser-originated calls via API route)
 *
 * Does not throw at import time — throws at call time if no transport
 * is available. This allows next build to complete without MCP access.
 */

interface CallMcpToolOptions {
  /** Override the default MCP server URL. For future multi-MCP support. */
  serverUrl?: string;
}

interface JsonRpcResponse {
  result?: {
    content?: { type: string; text: string }[];
  };
  error?: { message: string };
}

export async function callMcpTool<T>(
  tool: string,
  args: Record<string, unknown> = {},
  options?: CallMcpToolOptions,
): Promise<T> {
  const serverUrl = options?.serverUrl ?? process.env['MCP_SERVER_URL'];

  if (serverUrl) {
    return callToolHttp<T>(tool, args, serverUrl);
  }

  return callToolStdio<T>(tool, args);
}

// ─── HTTP transport (production) ─────────────────────────────────────────────

async function callToolHttp<T>(
  tool: string,
  args: Record<string, unknown>,
  serverUrl: string,
): Promise<T> {
  // MCP_SERVER_URL may point to .../mcp — derive the /tools/call endpoint
  const baseUrl = serverUrl.replace(/\/mcp$/, '');
  const res = await fetch(`${baseUrl}/tools/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool, args }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[MCP HTTP] ${tool} failed: ${res.status} ${res.statusText}: ${body}`);
  }

  return res.json() as Promise<T>;
}

// ─── stdio transport (local dev) ─────────────────────────────────────────────

const MCP_SERVER_PATH =
  process.env['MCP_SERVER_PATH'] ??
  join(process.cwd(), '..', '..', 'Biga', 'Biga-MCP', 'dist', 'index.js');

/**
 * Spawns the MCP server as a child process, runs the JSON-RPC handshake
 * (initialize → initialized → tools/call), extracts the result, and
 * kills the process.
 */
async function callToolStdio<T>(
  tool: string,
  args: Record<string, unknown>,
): Promise<T> {
  if (!existsSync(MCP_SERVER_PATH)) {
    throw new Error(
      `[MCP stdio] Server not found at ${MCP_SERVER_PATH}. ` +
        `Run "npm run build" in Biga-MCP/ for local dev, ` +
        `or set MCP_SERVER_URL for production.`,
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
          `[MCP stdio] Timed out after 10s (phase: ${phase}).` +
            (stderr ? ` stderr: ${stderr.slice(0, 500)}` : ''),
        ),
      );
    }, 10_000);

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.stdout.on('data', (data: Buffer) => {
      buffer += data.toString();

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('{')) continue;

        try {
          const msg = JSON.parse(trimmed) as JsonRpcResponse & { id?: number };

          if (phase === 'init' && msg.id === 1) {
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
            clearTimeout(timeout);

            if (msg.error) {
              child.kill();
              reject(new Error(`[MCP stdio] ${msg.error.message}`));
              return;
            }

            const textContent = msg.result?.content?.find(
              (c) => c.type === 'text',
            );
            if (textContent) {
              child.kill();
              try {
                resolve(JSON.parse(textContent.text) as T);
              } catch {
                resolve(textContent.text as T);
              }
              return;
            }

            child.kill();
            reject(new Error('[MCP stdio] Tool response had no text content'));
            return;
          }
        } catch {
          // Skip non-JSON lines
        }
      }
    });

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
          `[MCP stdio] Server exited during ${phase} phase without responding.` +
            (stderr ? ` stderr: ${stderr.slice(0, 500)}` : ''),
        ),
      );
    });
  });
}
