# Local Development Setup

## Prerequisites

- Node.js 22+
- Access to the Supabase project (session pooler connection string)

## Repositories

This frontend consumes the Biga-MCP server. Both repos are needed:

    Biga/Biga-MCP/           <- MCP server (data layer)
    Accidental Recipes/Biga/ <- this repo (Next.js frontend)

## Steps

1. Install dependencies in both repos:

       cd Biga/Biga-MCP && npm install
       cd Accidental\ Recipes/Biga && npm install

2. Build the MCP server (the frontend spawns the compiled JS):

       cd Biga/Biga-MCP && npm run build

3. Create `.env.local` in this repo:

       cp .env.example .env.local

   Fill in DATABASE_URL with your Supabase **session pooler** URL.
   Get it from: Supabase dashboard > Settings > Database > Connection string > Session pooler.
   It should look like: `postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:5432/postgres`

   Do NOT use the direct URL (`db.[ref].supabase.co`). It fails on networks
   that cannot resolve Supabase direct hostnames.

4. Start the dev server:

       npm run dev

5. Verify:

       curl -X POST http://localhost:3000/api/mcp \
         -H "Content-Type: application/json" \
         -d '{"tool":"health_check","args":{}}'

   Expected: `"OK - 56 recipe(s) in database"`

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| App crashes on start: `DATABASE_URL is not set` | Missing `.env.local` | Copy `.env.example` to `.env.local`, fill in the value |
| `getaddrinfo ENOENT db.xxx.supabase.co` | Using direct URL instead of pooler | Use the session pooler URL from Supabase dashboard |
| `MCP server not found at ...` | Biga-MCP not built | Run `npm run build` in `Biga/Biga-MCP/` |
| `MCP server timed out (phase: init)` | MCP server cannot connect to DB | Check DATABASE_URL is correct, check network connectivity |
| `MCP server timed out (phase: tool)` | Tool query hanging | Check Supabase dashboard for connection issues |
