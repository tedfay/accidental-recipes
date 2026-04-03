import { NextRequest, NextResponse } from 'next/server';
import { callMcpTool } from '@/lib/mcp-transport';

/**
 * API route — proxy for browser-originated MCP calls.
 *
 * Client components (HomePageClient.tsx) fetch('/api/mcp') from the
 * browser. This route forwards to the shared transport layer, which
 * calls Railway (HTTP) or spawns a local MCP process (stdio).
 *
 * Server components do NOT use this route — they call mcp-transport.ts
 * directly via mcp-client.ts.
 */

interface McpRequest {
  tool: string;
  args?: Record<string, unknown>;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as McpRequest;
  const { tool, args = {} } = body;

  if (!tool) {
    return NextResponse.json({ error: 'Missing tool name' }, { status: 400 });
  }

  try {
    const result = await callMcpTool(tool, args);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[MCP API] ${tool} failed:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
