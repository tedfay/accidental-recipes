import { NextRequest, NextResponse } from 'next/server';
import { siteConfig } from '@/lib/site-config';
import { submitSlugsToIndexNow } from '@/lib/indexnow';

/**
 * POST /api/indexnow — webhook for MCP write tools to notify IndexNow
 * after recipe publish/update.
 *
 * Body: { slugs: string[] }
 * Auth: Bearer token matching INDEXNOW_SUBMIT_KEY env var.
 *
 * Fire-and-forget from the caller's perspective — returns 202 immediately
 * after validating the request, then submits asynchronously.
 */
export async function POST(request: NextRequest) {
  const { submitKey } = siteConfig.indexNow;

  if (!submitKey) {
    return NextResponse.json(
      { error: 'IndexNow submit key not configured' },
      { status: 503 },
    );
  }

  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${submitKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { slugs?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const slugs = body.slugs;
  if (!Array.isArray(slugs) || slugs.length === 0) {
    return NextResponse.json({ error: 'slugs must be a non-empty array' }, { status: 400 });
  }

  // Fire submission asynchronously — don't block the response
  submitSlugsToIndexNow(slugs).catch((err) => {
    console.error('[api/indexnow] Background submission failed:', err);
  });

  return NextResponse.json({ accepted: slugs.length }, { status: 202 });
}
