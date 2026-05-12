# Credentials & Secrets Inventory

**Purpose:** The reference for which credentials exist, where each must
be set, and how to rotate one without breaking production. Read this
before changing any env var, generating any new key, or auditing what's
exposed.

**Rule:** This document never contains a credential VALUE — only names,
locations, and procedures. If you find yourself about to paste a real
key, stop.

**Last updated:** 2026-05-12

---

## The four runtime locations

Every credential lives in 1–4 of these places. Knowing which set a
credential belongs to is half the rotation procedure.

| Location | What it is | How to edit |
|---|---|---|
| **Local frontend** | `.env.local` at repo root | Edit the file. Restart `npm run dev`. |
| **Local MCP** | `Biga-MCP/.env` | Edit the file. Restart MCP server. |
| **Netlify** | Production frontend env vars | Netlify dashboard → site settings → Environment variables. Redeploy. |
| **Railway** | Production MCP server env vars | Railway dashboard → Biga-MCP service → Variables. Auto-redeploys on save. |

Two additional locations to remember when an MCP-native client is involved:
- **Claude Chat / Claude Code MCP config** — wherever the `MCP_API_KEY_WRITE` is wired for any client that uses the full `/mcp` Streamable HTTP endpoint
- **The repo itself** — `public/{INDEXNOW_API_KEY}.txt` is a file, not an env var; the file's *name* must equal the key value

---

## The credentials

### Sensitive (rotate if leaked)

| Name | What it is | Frontend local | MCP local | Netlify | Railway |
|---|---|:-:|:-:|:-:|:-:|
| `DATABASE_URL` | Supabase Postgres URL with embedded password | ✓ | ✓ | — | ✓ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin JWT (bypasses RLS, full DB control via REST/Storage) | — | ✓ | — | ✓ |
| `MCP_API_KEY_READ` | Auth for read tools on `/tools/call` | ✓ (if `MCP_SERVER_URL` set) | ✓ | ✓ | ✓ |
| `MCP_API_KEY_WRITE` | Auth for write tools on `/tools/call` + full `/mcp` endpoint | — | ✓ | — | ✓ |
| `INDEXNOW_SUBMIT_KEY` | Shared secret: MCP → frontend webhook auth | ✓ | ✓ | ✓ | ✓ |
| `SENTRY_AUTH_TOKEN` | Source-map upload at Netlify build time | — | — | ✓ | — |

### Public-by-design (but still configuration)

| Name | What it is | Frontend local | MCP local | Netlify | Railway |
|---|---|:-:|:-:|:-:|:-:|
| `INDEXNOW_API_KEY` | Equal to `public/{value}.txt` filename; Bing/Yandex verify by GET | ✓ | — | ✓ | — |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry project DSN — public by Sentry convention | ✓ | — | ✓ | — |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL — used to compose public image URLs | ✓ | — | ✓ | — |
| `SUPABASE_URL` | Same URL, non-public name (MCP side) | — | ✓ | — | ✓ |
| `NEXT_PUBLIC_GTM_ID` | Google Tag Manager container ID | ✓ | — | ✓ | — |
| `NEXT_PUBLIC_SITE_URL` | Site canonical URL (defaults to accidentalrecipes.com) | ✓ | — | ✓ | — |
| `MCP_SERVER_URL` | Railway base URL the frontend talks to | — | — | ✓ | — |
| `FRONTEND_URL` | Netlify URL the MCP IndexNow hook POSTs to | — | — | — | ✓ |
| `SENTRY_ORG` / `SENTRY_PROJECT` | Sentry org/project name (build-time) | — | — | ✓ | — |

### Local-only / runtime flags
`MCP_SERVER_PATH`, `NETLIFY`, `NODE_ENV`, `PORT`, `ANALYZE` — set by
platform or local convention. Not credentials.

---

## What reads each credential

The blast radius if a credential leaks depends on what reads it.

| Credential | Read by | Worst case if leaked |
|---|---|---|
| `DATABASE_URL` | `Biga-MCP/src/db.ts`, frontend in local dev | Full read + write to all recipes, ingredients, all tables |
| `SUPABASE_SERVICE_ROLE_KEY` | `Biga-MCP/src/storage-client.ts` | Bypasses row-level security; full Supabase REST + Storage admin |
| `MCP_API_KEY_READ` | `lib/mcp-transport.ts` (frontend) sends; `Biga-MCP/src/index.ts` validates | Read all recipes via Railway — but the site is public anyway, so realistically: rate-limit abuse |
| `MCP_API_KEY_WRITE` | `Biga-MCP/src/index.ts` validates; sent by Claude Chat / Code clients | Create, update, publish, modify any recipe |
| `INDEXNOW_SUBMIT_KEY` | `app/api/indexnow/route.ts` validates; `Biga-MCP/src/hooks/notify-indexnow.ts` sends | Trigger unwanted IndexNow submissions (low impact) |
| `SENTRY_AUTH_TOKEN` | Sentry build plugin in `next.config.ts` | Upload arbitrary source maps to your Sentry project |
| `INDEXNOW_API_KEY` | `lib/site-config.ts` → `lib/indexnow.ts` | None — it's public by design |

---

## Rotation procedure

### General rotation steps (any sensitive credential)

1. **Generate a new value.** For random secrets, `openssl rand -hex 32`
   or a password manager. For tokens issued by a service (Supabase keys,
   Sentry tokens), use the service's dashboard rotate function.
2. **Update every location** the credential lives in (see the table above).
   Do them all in one sitting — partial rotation breaks the pairing.
3. **Trigger a redeploy** on any platform whose env vars changed:
   - Netlify auto-redeploys on env-var change? Verify in dashboard
     settings — historically it does NOT auto-redeploy; trigger manually.
   - Railway auto-redeploys on env-var change ✓
4. **Verify** the system works end-to-end before considering the old
   value retired.
5. **Revoke the old value** at the issuer (Supabase / Sentry). For shared
   secrets you generate yourself, "revoke" means delete from every
   location and you're done.

### Per-credential notes

**`DATABASE_URL`** — The "value" is the password embedded in the URL.
Rotate via Supabase dashboard → Project Settings → Database → "Reset
database password." The session pooler URL host stays the same; only
the password changes. Update all 3 locations (frontend local, MCP local,
Railway). If a wrong password lands in Railway, the MCP server returns
500s for all requests; the site shows the global error boundary.

**`SUPABASE_SERVICE_ROLE_KEY`** — Supabase dashboard → Project Settings
→ API → "JWT Secret" rotation. WARNING: rotating the JWT secret
invalidates ALL existing service-role JWTs, anon keys, and any in-flight
user sessions. Only do this if the key is actually compromised.

**`MCP_API_KEY_READ` / `MCP_API_KEY_WRITE`** — These are values you
generate yourself. To rotate: generate new value, update on Railway,
update on Netlify (read key only), update any MCP-native client config
(write key). The MCP server returns 401 immediately if a stale key
arrives — easy to spot regressions.

**`INDEXNOW_SUBMIT_KEY`** — Generate, update on Netlify + Railway. If
mismatched, MCP publishes silently succeed at writing the recipe but
the IndexNow ping returns 401 (logged but non-fatal).

**`SENTRY_AUTH_TOKEN`** — Sentry dashboard → Settings → Account → API
→ Auth Tokens. Generate new, update on Netlify, revoke the old. Affects
build-time source-map upload only; runtime is unaffected by a stale
token.

**`INDEXNOW_API_KEY`** — Rotation = (1) generate new UUID-like value,
(2) rename `public/{old}.txt` to `public/{new}.txt`, (3) update Netlify
env var, (4) commit and deploy. The OLD key file 404s after deploy
and Bing eventually re-verifies against the new one. Do this rarely.

---

## Cross-checks: things that should match

- The string inside `public/{INDEXNOW_API_KEY}.txt` MUST equal the
  filename without the `.txt` and MUST equal the Netlify env var value.
  Three places, one value.
- `MCP_API_KEY_READ` on Netlify MUST equal `MCP_API_KEY_READ` on Railway.
  If they drift, the frontend cannot read.
- `MCP_API_KEY_WRITE` on Railway MUST equal whatever any MCP-native
  client (Claude Chat / Code) is configured to send.
- `INDEXNOW_SUBMIT_KEY` on Netlify MUST equal the same on Railway.
- `DATABASE_URL` on Railway MUST be the SESSION POOLER URL
  (`aws-0-…pooler.supabase.com`), not the direct URL — direct fails DNS
  on many networks (per `lib/env.ts:43`).

---

## Anti-patterns we've encountered

1. **Approving Claude Code permission strings that include credentials
   verbatim.** Every time you click "Always allow" on a command like
   `curl -H 'X-API-Key: …'`, the literal key string gets added to
   `.claude/settings.local.json`. That file is tracked in git
   (intentional, for sharing approvals). Two known incidents:
   - DB password landed in `0b4806c` (`DATABASE_URL=…kungub…`)
   - Railway MCP API key landed in the working tree as `…a29a426c…`
     before this doc was written
   **Mitigation:** never approve a command with a literal secret in it.
   Prefer commands that read from env vars (`$MCP_API_KEY_WRITE`) so the
   approved string contains no secret.

2. **Setting `MCP_API_KEY_WRITE` on Netlify.** The frontend never writes
   — only reads. Setting the write key there enlarges the blast radius
   if the frontend env vars are ever leaked.

3. **Direct Supabase host in `DATABASE_URL`.** Fails DNS on most home
   networks. Always use the session pooler URL.

---

## Related tickets
- 2FI-205 — Biga-MCP HTTP auth introduction (created the read/write key split)
- 2FI-241 — Tightened the per-tool permission map on `/tools/call`
- 2FI-100 — HTTP transport selection (introduced `MCP_SERVER_URL`)
- 2FI-178 — Sentry wiring (introduced `SENTRY_AUTH_TOKEN` requirement)
- 2FI-215 — Image storage (introduced `SUPABASE_SERVICE_ROLE_KEY` need)
