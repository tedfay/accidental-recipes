import { NextRequest, NextResponse } from 'next/server';

/**
 * Edge redirects that a static rule can't express.
 *
 * Netlify `[[redirects]]` and Next.js `next.config` redirects both
 * re-append the incoming query string to the destination, so a
 * "strip ?m=" rule loops forever. Building the target URL by hand
 * here is the only deterministic way to drop a query param.
 *
 * Two normalizations, folded into one 301:
 *   1. www.accidentalrecipes.com  → accidentalrecipes.com   (apex is canonical)
 *   2. ?m=1 / ?m=0 (legacy Blogger mobile view param)  → dropped
 *
 * http→https is handled by Netlify's automatic TLS upgrade upstream.
 */
export function middleware(req: NextRequest): NextResponse | undefined {
  const host = (req.headers.get('host') ?? '').split(':')[0].toLowerCase();
  const url = req.nextUrl.clone();
  let changed = false;

  if (host === 'www.accidentalrecipes.com') {
    url.hostname = 'accidentalrecipes.com';
    url.port = '';
    url.protocol = 'https:';
    changed = true;
  }

  if (url.searchParams.has('m')) {
    url.searchParams.delete('m');
    changed = true;
  }

  if (changed) {
    return NextResponse.redirect(url, 301);
  }

  return undefined;
}

/**
 * Skip Next internals, API routes, and any path with a file extension
 * (favicon.ico, robots.txt, sitemap.xml, static assets).
 */
export const config = {
  matcher: ['/((?!api/|_next/|.*\\..*).*)'],
};
