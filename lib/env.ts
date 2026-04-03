/**
 * Startup validation for required environment variables.
 *
 * Imported as a side-effect in app/layout.tsx so the dev server fails
 * immediately with a clear message instead of silently starting and
 * failing on first request.
 *
 * During Netlify builds, DATABASE_URL is not needed — the frontend
 * reaches the MCP server over HTTP (MCP_SERVER_URL), not via a local
 * database. Warn instead of throw so the build completes.
 */

const isBuildPhase =
  process.env['NETLIFY'] === 'true' || process.env['CI'] === 'true';

const required = ['DATABASE_URL'] as const;

for (const key of required) {
  if (!process.env[key]) {
    if (isBuildPhase) {
      console.warn(`[env] ${key} is not set (build phase — skipping).`);
    } else {
      throw new Error(
        `[env] ${key} is not set.\n` +
          `Copy .env.example to .env.local and fill in your Supabase session pooler URL.\n` +
          `See SETUP.md for details.`,
      );
    }
  }
}

const dbUrl = process.env['DATABASE_URL'];
if (dbUrl && dbUrl.includes('.supabase.co') && !dbUrl.includes('pooler.supabase.com')) {
  console.warn(
    `[env] DATABASE_URL appears to use the direct Supabase host, not the session pooler.\n` +
      `This will fail on networks that can't resolve Supabase direct hostnames.\n` +
      `Use the session pooler URL: aws-0-[region].pooler.supabase.com`,
  );
}
