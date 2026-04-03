/**
 * Startup validation for required environment variables.
 *
 * Imported as a side-effect in app/layout.tsx so the dev server fails
 * immediately with a clear message instead of silently starting and
 * failing on first request.
 */

const required = ['DATABASE_URL'] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(
      `[env] ${key} is not set.\n` +
        `Copy .env.example to .env.local and fill in your Supabase session pooler URL.\n` +
        `See SETUP.md for details.`,
    );
  }
}

const dbUrl = process.env['DATABASE_URL']!;
if (dbUrl.includes('.supabase.co') && !dbUrl.includes('pooler.supabase.com')) {
  console.warn(
    `[env] DATABASE_URL appears to use the direct Supabase host, not the session pooler.\n` +
      `This will fail on networks that can't resolve Supabase direct hostnames.\n` +
      `Use the session pooler URL: aws-0-[region].pooler.supabase.com`,
  );
}
