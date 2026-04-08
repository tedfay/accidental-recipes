/**
 * Startup validation for required environment variables.
 *
 * Imported as a side-effect in app/layout.tsx so the dev server fails
 * immediately with a clear message instead of silently starting and
 * failing on first request.
 *
 * In production (Netlify), the frontend reaches the MCP server over
 * HTTP via MCP_SERVER_URL. DATABASE_URL is only needed in local dev
 * where the Next.js API route spawns the MCP server as a child process.
 */

const hasMcpServerUrl = !!process.env['MCP_SERVER_URL'];
const isNetlify = process.env['NETLIFY'] === 'true';

// Warn loudly if Netlify is missing MCP_SERVER_URL — all data calls will fail.
if (isNetlify && !hasMcpServerUrl) {
  console.error(
    '[env] MCP_SERVER_URL is not set on Netlify. ' +
      'All MCP calls will fail — set this to your Railway deployment URL.',
  );
}

// MCP_API_KEY_READ is required when talking to Railway over HTTP.
if (hasMcpServerUrl && !process.env['MCP_API_KEY_READ']) {
  console.error(
    '[env] MCP_API_KEY_READ is not set. ' +
      'All MCP calls to Railway will be rejected (401).',
  );
}

// DATABASE_URL is only required when running locally without MCP_SERVER_URL.
// On Netlify (build and runtime), the frontend talks to Railway — no database needed.
if (!hasMcpServerUrl && !isNetlify) {
  const dbUrl = process.env['DATABASE_URL'];
  if (!dbUrl) {
    throw new Error(
      `[env] DATABASE_URL is not set.\n` +
        `Copy .env.example to .env.local and fill in your Supabase session pooler URL.\n` +
        `See SETUP.md for details.`,
    );
  }

  if (dbUrl.includes('.supabase.co') && !dbUrl.includes('pooler.supabase.com')) {
    console.warn(
      `[env] DATABASE_URL appears to use the direct Supabase host, not the session pooler.\n` +
        `This will fail on networks that can't resolve Supabase direct hostnames.\n` +
        `Use the session pooler URL: aws-0-[region].pooler.supabase.com`,
    );
  }
}
