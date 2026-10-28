# Accidental Recipes — Biga frontend

Next.js (App Router) frontend for [accidentalrecipes.com](https://accidentalrecipes.com),
deployed to Netlify. It is a pure HTTP consumer of the Biga-MCP server
(`tedfay/biga-mcp`, deployed on Railway). It never touches the database.

- Architecture and constraints: [`CLAUDE.md`](CLAUDE.md) — read before changing code
- Credential inventory and rotation: [`docs/secrets.md`](docs/secrets.md)
- Local stdio setup: [`SETUP.md`](SETUP.md) — partly outdated, see [below](#outdated-guidance-in-setupmd)

## How data flows

```
Browser ──► Netlify (Next.js) ──HTTP POST /tools/call──► Railway (Biga-MCP) ──► Postgres
                 │
                 └─ /api/mcp  (proxy for client components only; write tools blocked)
```

`lib/mcp-transport.ts` picks the transport:

| `MCP_SERVER_URL` | Transport | Used by |
|---|---|---|
| set | HTTP POST to `<base>/tools/call` with `X-API-Key: $MCP_API_KEY_READ` | Netlify, cloud sessions, recommended local dev |
| unset | Spawns Biga-MCP as a stdio child process | Legacy local dev (needs `DATABASE_URL` and a built Biga-MCP) |

A trailing `/mcp` on `MCP_SERVER_URL` is stripped before `/tools/call` is
appended. A hand-written `curl "$MCP_SERVER_URL/tools/call"` will 404 if the
value ends in `/mcp`; use the bare origin.

## Environments and configuration

Names only. Values live in the platform dashboards; see
[`docs/secrets.md`](docs/secrets.md) for where each one is set.

### Netlify (production frontend)

| Variable | Purpose |
|---|---|
| `MCP_SERVER_URL` | MCP server origin, `https://mcp.accidentalrecipes.com` (Railway service `accidental-recipes-mcp`) |
| `MCP_API_KEY_READ` | Read key for `/tools/call`. Must match Railway. Never set the write key here. |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL (defaults to accidentalrecipes.com) |
| `NEXT_PUBLIC_SENTRY_DSN` | Runtime error reporting. Unset = Sentry disabled. |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | Build-time source-map upload |
| `NEXT_PUBLIC_GTM_ID` | Analytics (fires only after consent) |
| `NEXT_PUBLIC_SUPABASE_URL` | Composes public image URLs |
| `INDEXNOW_API_KEY`, `INDEXNOW_SUBMIT_KEY` | IndexNow submission and webhook auth |

### Claude Code cloud sessions (verified 2026-10-28)

The **Biga frontend** cloud environment authenticates to the MCP server
through its **network proxy**, not through an env var:

- **Network secret:** one, for `mcp.accidentalrecipes.com`, scoped to the
  `/tools/call` path. It makes the proxy inject the `x-api-key` header. The
  old Railway host's secret was removed on 2026-10-28, so calls to
  `accidental-recipes-production.up.railway.app` from cloud sessions get 401.
  Because of the path scope, the proxy returns 403 for other paths on the
  new host, `/health` included; that 403 comes from the proxy, not the server. The key value is
  held by the environment config and is never visible in the session. Use a
  read-level key here, never the write key. When `MCP_API_KEY_READ` is
  rotated, update this network secret too (see
  [`docs/secrets.md`](docs/secrets.md)); otherwise cloud sessions get 401s.
  Secrets can't be edited in place: delete and re-add, and re-check the
  path spelling (a `/toos/call` typo cost a round on 2026-10-28).
- **No write-key environment.** Cloud sessions can read content but not
  create, edit or publish it. Decided 2026-10-28: authoring from the cloud
  waits for OAuth on `/mcp` (2FI-250) instead of a write-key environment
  (2FI-641).
- **Env vars set in the environment:** `MCP_SERVER_URL`
  (`https://mcp.accidentalrecipes.com/mcp`). `MCP_TOOL_TIMEOUT` and `MCP_CONNECTION_NONBLOCKING` are also
  set; the app code does not read them.
- **`MCP_API_KEY_READ` is intentionally not set.** As a result, `lib/env.ts`
  logs `[env] MCP_API_KEY_READ is not set … will be rejected (401)` during
  builds. In this environment that warning is a false positive: the proxy
  adds the key and calls succeed.
- **Blocked egress that matters:**
  - `o1.ingest.sentry.io`: Sentry build-plugin telemetry. It used to crash the
    build with an uncaught `ECONNRESET`; `telemetry: false` in `next.config.ts`
    (PR #4) turns it off. Runtime error reporting is unaffected. If a future
    Sentry upgrade or config change brings back an `ECONNRESET` during
    compile, check that option first.
  - `telemetry.nextjs.org`: Next.js telemetry. Fails harmlessly.
  - `accidentalrecipes.com`: the production site itself. A cloud session
    cannot check the live sitemap; do that from outside (see
    [Deployment workflow](#deployment-workflow)).
- **What this does not prove:** because the proxy supplies the key, a passing
  cloud build does not validate the `MCP_API_KEY_READ` value stored on Netlify.

## Checks

Run in this order. All are read-only against MCP.

```sh
npm ci              # install from package-lock.json
npm run typecheck   # tsc --noEmit
npm run build       # next build; prerenders sitemap.xml and robots.txt from live MCP data
```

**Exit 0 is not sufficient.** `app/sitemap.ts` catches MCP failures, logs
`[sitemap] MCP searchContent failed`, and falls back to two static URLs, so
the build still passes if MCP is unreachable. Verify the prerendered sitemap
contains recipes:

```sh
grep -c '\[sitemap\] MCP' build.log            # expect 0 (capture build output to build.log)
f=.next/server/app/sitemap.xml.body
grep -o '<loc>[^<]*/recipes/' "$f" | wc -l     # expect > 0
```

The pass condition is "recipe URLs are present," not a specific number. The
catalog grows as recipes are published, so counts in this file are dated
observations only.

Optional direct probe of the read path (cloud sessions: the proxy adds the key;
elsewhere add `-H "X-API-Key: $MCP_API_KEY_READ"`):

```sh
B=$(echo "$MCP_SERVER_URL" | sed -E 's#(https?://[^/]+).*#\1#')
curl -sS -X POST "$B/tools/call" -H 'Content-Type: application/json' \
  -d '{"tool":"search_content","args":{"limit":1}}'
```

`health_check` is not exposed on `/tools/call` (it returns `Unknown tool`).
Use a read tool such as `search_content` to probe.

**Do not run write tools** (`create_recipe`, `update_recipe`,
`publish_recipe`) or import scripts as part of verification.

### Last verified result — 2026-10-21

Cloud session, on the tree now on `main` (PR #4 merged):

| Check | Result |
|---|---|
| Proxy-authenticated `search_content` on `/tools/call` | Pass — returned recipe data |
| `npm ci` | Pass (npm audit reports 32 vulnerabilities, not yet triaged) |
| `npm run typecheck` | Pass |
| `npm run build`, fresh `.next`, no env overrides | Pass |
| Prerendered sitemap | Recipe URLs present (observed: 58 recipes + `/` + `/ingredients`, all with `lastmod`) |

Production, after the PR #4 deploy (checked outside the cloud session, which
cannot reach the production host):

| Check | Result |
|---|---|
| Production pages | Verified by the maintainer |
| Production `sitemap.xml` | Verified by the maintainer on 2026-10-20: recipe URLs present. Total count not checked. |

## Deployment workflow

1. Branch from `main`, make the change, run the [checks](#checks) including
   the sitemap verification.
2. Open a pull request against `main`. Working convention: changes land
   through PRs rather than direct pushes to `main`.
3. Netlify builds with `npm run build` and publishes `.next` (see
   [`netlify.toml`](netlify.toml), which also carries security headers and
   the Blogger 301 redirects). The production branch and deploy previews are
   configured in the Netlify dashboard, not in this repo.
4. After merge, confirm the production sitemap at
   `https://accidentalrecipes.com/sitemap.xml` lists recipe URLs. Do this
   from a machine that can reach the site; cloud sessions are blocked from it.
5. Env var changes on Netlify do not reliably trigger a redeploy; trigger
   one manually (see `docs/secrets.md`).

The MCP server deploys separately: Railway auto-deploys `main` of
`tedfay/biga-mcp`. Never edit MCP source from this repo.

## Outdated guidance in SETUP.md

`SETUP.md` predates the HTTP transport (2FI-100) and the MCP repo split
(2FI-193). Until it is rewritten, treat these items as wrong:

| SETUP.md says | Current state |
|---|---|
| Both repos live at `Biga/Biga-MCP/` and `Accidental Recipes/Biga/` | MCP is its own repo, `tedfay/biga-mcp` (`C:\dev\biga-mcp\`); this repo is `C:\dev\biga\` |
| Local dev requires building Biga-MCP and a `DATABASE_URL` | Setting `MCP_SERVER_URL` + `MCP_API_KEY_READ` in `.env.local` uses Railway over HTTP with no database or MCP build. Neither SETUP.md nor `.env.example` mentions these two variables; add them to `.env.local` by hand. |
| Frontend spawns the compiled MCP from a sibling path | Still true in stdio mode, but the default `MCP_SERVER_PATH` in `lib/mcp-transport.ts` points at the pre-split `../../Biga/Biga-MCP/dist/index.js`. Set `MCP_SERVER_PATH` explicitly. |
| `npm install` | Use `npm ci` to install from the lockfile |
| Verify with `health_check` via `/api/mcp`, expect `"OK - 56 recipe(s)"` | `health_check` returns `Unknown tool` on Railway `/tools/call`, so this fails in HTTP mode. The expected count is also wrong as a pass condition, since it changes whenever a recipe is published. Use the [checks](#checks) above. |
| Fill in `DATABASE_URL` (the only variable step 3 mentions) | `.env.example` has two entries: `DATABASE_URL` (needed only in stdio mode) and `NEXT_PUBLIC_SUPABASE_URL` (composes public image URLs; SETUP.md doesn't mention it) |
