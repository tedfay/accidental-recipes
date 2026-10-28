# Credentials & Secrets Inventory

**Purpose:** The reference for which credentials exist, where each must
be set, and how to rotate one without breaking production. Read this
before changing any env var, generating any new key, or auditing what's
exposed.

**Single source of truth.** This file is the only inventory. The Linear
document "Credentials & Secrets Inventory" is a pointer to it, and
CLAUDE.md files in `tedfay/accidental-recipes` and `tedfay/biga-mcp` link
here. If you find credential locations described anywhere else, update
this file and replace the other copy with a link.

**Rule:** This document never contains a credential VALUE — only names,
locations, and procedures. If you find yourself about to paste a real
key, stop.

**Last updated:** 2026-10-28 (Mac mini scanned, 2FI-642; MCP host move and OneDrive cleanup, 2FI-659; write-key cloud environment approved, not yet created, 2FI-641)

---

## Where credentials live

Every credential lives in one or more of these places. Knowing which set
a credential belongs to is half the rotation procedure.

| Location | What it is | How to edit |
|---|---|---|
| **Password manager** | Where new values are stored first. The source for every copy below. | Save the new value here before putting it anywhere else. |
| **Railway** | Production MCP server env vars. Project `adequate-renewal`, environment `production`, service `accidental-recipes-mcp` (renamed from `accidental-recipes` 2026-10-28, Railway dashboard). | Railway dashboard → service → Variables → save → **Deploy** on the staged-changes banner. |
| **Netlify** | Production frontend env vars | Netlify dashboard → site → Environment variables. Then Deploys → Trigger deploy → **Clear cache and deploy site**. Env var changes do not redeploy on their own. |
| **Claude Code cloud dev environment** | "Biga frontend" environment. The proxy injects `x-api-key` on `/tools/call`, one network secret, for `mcp.accidentalrecipes.com` (the old Railway host's secret was removed 2026-10-28, 2FI-659). No env var. See README "Claude Code cloud sessions". | Environment settings (needs a browser; the iPad app can't edit credentials). |
| **Local frontend** | `C:\dev\biga\.env.local` | Edit the file. Restart `npm run dev`. |
| **The repo itself** | `public/{INDEXNOW_API_KEY}.txt` is a file, not an env var; the file's *name* must equal the key value | Commit and deploy. |

**Planned or occasional locations:**

- **"Biga content" cloud environment** (2FI-641, proposed name; confirm when created): **approved, not created yet** (decision reversed 2026-10-28, recorded in 2FI-626). Will hold one network secret: the write key as `X-Api-Key` to `mcp.accidentalrecipes.com`, path `/tools/call` only. Used only for authoring, never for coding. Add it to the locations table above when it exists. OAuth on `/mcp` (2FI-250) is parked, not abandoned.
- **Ingestion pipeline** (`tedfay/biga-ingest`, formerly `biga-technical`): needs `DATABASE_URL` and `ANTHROPIC_API_KEY` in a local `.env` only while you run it. Keep that `.env` in a clone outside OneDrive, and delete or blank it when done.
- **`claude mcp add` entries** (`biga-web`): any machine where the write key was added to Claude Code with `--header`. Check with `claude mcp list`.

**Retired locations (should hold nothing):**

| Location | Status |
|---|---|
| `C:\dev\biga\Biga-MCP\.env` | Deleted 2026-10-23. The folder is a leftover from before the biga-mcp repo split (2FI-193). |
| `OneDrive\2 Find Marketing\Biga\Biga Technical\.env` | Deleted 2026-10-23 and purged from OneDrive's recycle bin. A secrets file in a synced folder is a copy we don't need. |
| Claude Desktop config (`claude_desktop_config.json`, Windows) | Still holds a stale `DATABASE_URL`. Local Biga is broken and being retired (2FI-656, 2FI-256, 2FI-257). Delete the `biga` entry; don't update it. |
| OneDrive `2 Find Marketing/Biga` folder (incl. the `Biga Technical` checkout) | Deleted 2026-10-28 (2FI-659). Its `probe-url-from-pw.mjs` held a Postgres URL with the pre-2026-10-23 password (dead since the 2FI-642 reset). Content lives in `tedfay/biga-docs` and `tedfay/biga-ingest`; the deletion sits in the 2findmarketing account's OneDrive recycle bin for 30 days. |
| Mac mini | Scanned 2026-10-28, nothing kept (2FI-642). No `.env` files (home, iCloud Drive, synced OneDrive), no Claude Code CLI, no Biga entry in the Claude Desktop config. `biga claude key.txt` (synced from OneDrive `Biga Technical`) deleted and purged; no matching key existed in the Anthropic Console. |

---

## The credentials

### Sensitive (rotate if leaked)

| Name | What it is | Railway | Netlify | Cloud env | Local frontend | Other |
|---|---|:-:|:-:|:-:|:-:|---|
| `DATABASE_URL` | Supabase Postgres Session pooler URL with embedded password | ✓ | — | — | — | Biga Technical while running |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secret key (`sb_secret_…`) for Storage uploads. The name is historical; it is no longer a JWT. | ✓ | — | — | — | — |
| `MCP_API_KEY_READ` | Auth for read tools on `/tools/call` | ✓ | ✓ | ✓ (network secret) | ✓ | — |
| `MCP_API_KEY_WRITE` | Auth for write tools on `/tools/call` and the full `/mcp` endpoint | ✓ | — | — | — | `biga-web` CLI entries (none found on the Mac mini; PC unchecked) |
| `INDEXNOW_SUBMIT_KEY` | Shared secret: Railway hook → Netlify `/api/indexnow` | ✓ | ✓ | — | — | — |
| `SENTRY_AUTH_TOKEN` | Source-map upload at Netlify build time | — | ✓ | — | — | — |
| `ANTHROPIC_API_KEY` | Claude API, used by the Biga Technical parser | — | — | — | — | Biga Technical while running |

`DATABASE_URL` is not needed in the local frontend `.env.local` while
`MCP_SERVER_URL` is set (see `lib/env.ts`). Leave it out.

### Public-by-design (but still configuration)

| Name | What it is | Railway | Netlify | Local frontend |
|---|---|:-:|:-:|:-:|
| `INDEXNOW_API_KEY` | Equal to `public/{value}.txt` filename; Bing/Yandex verify by GET | — | ✓ | ✓ |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry project DSN — public by Sentry convention | — | ✓ | ✓ |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL — used to compose public image URLs | — | ✓ | ✓ |
| `SUPABASE_URL` | Same URL, non-public name (MCP side) | ✓ | — | — |
| `NEXT_PUBLIC_GTM_ID` | Google Tag Manager container ID | — | ✓ | ✓ |
| `NEXT_PUBLIC_SITE_URL` | Site canonical URL (defaults to accidentalrecipes.com) | — | ✓ | ✓ |
| `MCP_SERVER_URL` | Railway base URL the frontend talks to | — | ✓ | ✓ |
| `FRONTEND_URL` | Netlify URL the MCP IndexNow hook POSTs to (`https://accidentalrecipes.com`) | ✓ | — | — |
| `SENTRY_ORG` / `SENTRY_PROJECT` | Sentry org/project name (build-time) | — | ✓ | — |

### Local-only / runtime flags
`MCP_SERVER_PATH`, `NETLIFY`, `NODE_ENV`, `PORT`, `ANALYZE` — set by
platform or local convention. Not credentials.

---

## What reads each credential

The blast radius if a credential leaks depends on what reads it.

| Credential | Read by | Worst case if leaked |
|---|---|---|
| `DATABASE_URL` | biga-mcp `src/db.ts`; Biga Technical scripts | Full read + write to all recipes, ingredients, all tables |
| `SUPABASE_SERVICE_ROLE_KEY` | biga-mcp `src/storage-client.ts` (via `update_recipe_image`) | Bypasses row-level security; full Supabase REST + Storage admin |
| `MCP_API_KEY_READ` | `lib/mcp-transport.ts` (frontend) sends; biga-mcp `src/index.ts` validates | Read all recipes via Railway — but the site is public anyway, so realistically: rate-limit abuse |
| `MCP_API_KEY_WRITE` | biga-mcp `src/index.ts` validates; sent by MCP clients and manual `curl` | Create, update, publish, modify any recipe |
| `INDEXNOW_SUBMIT_KEY` | `app/api/indexnow/route.ts` validates; biga-mcp `src/hooks/notify-indexnow.ts` sends | Trigger unwanted IndexNow submissions for our own URLs (low impact) |
| `SENTRY_AUTH_TOKEN` | Sentry build plugin in `next.config.ts` | Upload arbitrary source maps to your Sentry project |
| `ANTHROPIC_API_KEY` | Biga Technical `src/services/parser.ts`, `src/scripts/execute-import.ts` | Spend on our Anthropic account |
| `INDEXNOW_API_KEY` | `lib/site-config.ts` → `lib/indexnow.ts` | None — it's public by design |

---

## What a bad credential looks like

Failures here are quiet. Know the symptoms before you rotate.

| Broken credential | What you see |
|---|---|
| `MCP_API_KEY_READ` wrong on Netlify (or Railway changed first) | Recipe and ingredient pages show **"Page not found"**, not an error. Railway deploy logs show nothing. Railway Network Logs show tiny responses (66–172 bytes). Cause: the pages turn any MCP failure into a 404 (`app/recipes/[slug]/page.tsx`). |
| `DATABASE_URL` wrong on Railway | Same "Page not found" on recipe pages (the MCP server errors, the page catches it). |
| `SUPABASE_SERVICE_ROLE_KEY` not a live key | `update_recipe_image` fails with `Upload failed: … Invalid Compact JWS`. Nothing else breaks, so it goes unnoticed until someone uploads. |
| `INDEXNOW_SUBMIT_KEY` mismatched | Publishes still succeed. Railway deploy logs show `[notify-indexnow] 401 from …`. Nothing reaches IndexNow. |
| `MCP_API_KEY_*` wrong in a `curl` test | `{"error":"Missing or invalid API key"}`, HTTP 401. |
| Cloud dev environment read key stale | Tool calls from cloud sessions return 401. |

---

## Rotation procedure

### General rotation steps (any sensitive credential)

1. **Generate a new value and save it in the password manager first.** For
   random secrets, the password manager's generator or `openssl rand -hex 32`.
   For service-issued keys (Supabase, Sentry), use the service's dashboard.
2. **Update every location** the credential lives in (see the tables above,
   including the cloud environment and any `biga-web` entries). Do them all
   in one sitting — partial rotation breaks the pairing.
3. **Redeploy** every platform whose env vars changed: Railway (Deploy on
   the staged-changes banner) and Netlify (Clear cache and deploy site).
4. **Verify** end to end, using the tests below. Never consider a
   rotation done on "it saved."
5. **Revoke the old value** at the issuer (Supabase / Sentry). For shared
   secrets you generate yourself, "revoke" means delete from every
   location and you're done.
6. **Update this file** (consumers, last-rotated date) in the same sitting.

### Order and downtime

Railway validates the MCP keys; Netlify and the cloud environment send
them. The server accepts exactly one value per key, so **rotating
`MCP_API_KEY_READ` always causes downtime**: from the moment the Railway
deploy goes live until Netlify's deploy is published, recipe pages show
"Page not found". Keep the gap short: update both dashboards first, then
trigger both deploys back to back. (Zero-downtime rotation would need the
server to accept an old and a new key during an overlap window.)

For `INDEXNOW_SUBMIT_KEY`, update Netlify first (the receiver), then
Railway. A mismatch window only drops IndexNow pings.

### Per-credential notes

**`DATABASE_URL`** — The "value" is the password embedded in the URL.
Rotate via Supabase dashboard → Project Settings → Database → "Reset
database password." The Session pooler host stays the same; only the
password changes. If you need the full current URL, copy it from
Railway's variable; the password manager may hold only the password.

**`SUPABASE_SERVICE_ROLE_KEY`** — A Supabase **secret key** (`sb_secret_…`),
not the legacy service-role JWT. Legacy JWT keys were disabled and the
legacy HS256 JWT secret revoked on 2026-10-22. To rotate: Supabase →
Project Settings → API Keys → Secret keys → create a new key with a dated
name (e.g. `biga-railway-YYYY-MM-DD`) → save it in the password manager →
set it on Railway → deploy → verify an upload (below) → delete every other
secret key. Railway is the only consumer.

**`MCP_API_KEY_READ`** — Generate, then update Railway, Netlify, the cloud
dev environment's network secret (`mcp.accidentalrecipes.com`), and `.env.local`. Redeploy Railway and
Netlify. See "Order and downtime."

**`MCP_API_KEY_WRITE`** — Generate, update Railway, deploy. Then update any
`biga-web` entry (`claude mcp list`) and the "Biga content" environment if
it exists. Never set it on Netlify or in the cloud dev environment.

**`INDEXNOW_SUBMIT_KEY`** — Generate one value and set the **same** value
on Netlify and Railway (the route compares it exactly). Redeploy both.

**`SENTRY_AUTH_TOKEN`** — Sentry dashboard → Settings → Account → API
→ Auth Tokens. Generate new, update on Netlify, revoke the old. Affects
build-time source-map upload only; runtime is unaffected by a stale
token.

**`INDEXNOW_API_KEY`** — Rotation = (1) generate new UUID-like value,
(2) rename `public/{old}.txt` to `public/{new}.txt`, (3) update Netlify
env var, (4) commit and deploy. The OLD key file 404s after deploy
and Bing eventually re-verifies against the new one. Do this rarely.

---

## Verifying a credential without exposing it

Test whether a credential **works**. Never print, echo, or measure it.

- **Prefix every pasted command with `true;`.** Pasting into Git Bash can
  add an invisible leading character. If it lands on a variable assignment
  (`K=$(…)`), Bash treats the whole thing as a command name and prints the
  expanded secret in its error message. This happened on 2026-10-23 and
  forced a second read-key rotation.
- **Pipe headers instead of using variables:**
  ```bash
  true; grep '^MCP_API_KEY_READ=' /c/dev/biga/.env.local | tr -d '\r"' \
    | sed 's/^MCP_API_KEY_READ=/x-api-key: /' \
    | curl -sS -o /dev/null -w '%{http_code}\n' -H @- -H "Content-Type: application/json" \
      -X POST https://mcp.accidentalrecipes.com/tools/call \
      -d '{"tool":"search_content","args":{"limit":1}}'
  ```
  200 = current, 401 = stale.
- **Keys from the password manager:** `true; read -rs NAME && export NAME`,
  paste with right-click → Paste, then use `$NAME` in a `curl` header.
  Close the terminal when done.
- **`DATABASE_URL`:** connect and run `SELECT 1`, printing only PASS/FAIL
  and the error code (`28P01` = wrong password). Node with the `postgres`
  package from a biga-mcp checkout works; `psql` isn't installed on the PC.
- **`SUPABASE_SERVICE_ROLE_KEY` (production path):** call
  `update_recipe_image` with `force: false` on a recipe that already has a
  stored hero, using that hero's own public URL as the source. `The resource
  already exists` means the key passed auth, and nothing is modified. Find
  such a recipe first with `get_recipe` (look for `"storage_path"`); on a
  recipe with no hero, the upload would succeed and publish.
- **Supabase key identity:** compare the start of the value with the
  partly-masked keys under Supabase → API Keys. Don't rely on length or
  shape alone.
- **`INDEXNOW_SUBMIT_KEY`:** `POST /api/indexnow` with the key → 202
  `{"accepted":1}`, then check the Netlify function log for
  `[indexnow] Submitted`. For Railway's copy, trigger a slug-only
  `update_recipe` (changes nothing, fires the hook) and confirm Railway
  logs no `[notify-indexnow]` error.
- `health_check` is **not** available on `/tools/call`; it returns
  `Unknown tool`. Use `search_content` with `limit: 1` as the read probe.
- Biga's JSON responses are pretty-printed (`"key": "value"`), so grep
  patterns need `": *"`.

---

## Cross-checks: things that should match

- The string inside `public/{INDEXNOW_API_KEY}.txt` MUST equal the
  filename without the `.txt` and MUST equal the Netlify env var value.
  Three places, one value.
- `MCP_API_KEY_READ` on Netlify, in the cloud dev environment, and in
  `.env.local` MUST equal the value on Railway.
- `MCP_API_KEY_WRITE` on Railway MUST equal whatever any MCP client is
  configured to send.
- `INDEXNOW_SUBMIT_KEY` on Netlify MUST equal the same on Railway. Netlify
  stores per-context values; check that every context (including "dev")
  matches or is empty.
- `SUPABASE_SERVICE_ROLE_KEY` on Railway MUST match a key listed under
  Supabase → API Keys → Secret keys, and SHOULD be the only key listed.
- `DATABASE_URL` on Railway MUST be the SESSION POOLER URL
  (`aws-0-…pooler.supabase.com`), not the direct URL — direct fails DNS
  on many networks (per `lib/env.ts`).

---

## Anti-patterns we've encountered

1. **Approving Claude Code permission strings that include credentials
   verbatim.** Every time you click "Always allow" on a command like
   `curl -H 'X-API-Key: …'`, the literal key string gets added to
   `.claude/settings.local.json`. That file is tracked in git
   (intentional, for sharing approvals). Two known incidents:
   - A DB password landed in commit `0b4806c`
   - A Railway MCP API key landed in the working tree before this doc
     was written
   Both values have since been rotated, but they remain in git history.
   (Don't quote fragments of leaked values here, even rotated ones.)
   **Mitigation:** never approve a command with a literal secret in it.
   Prefer commands that read from env vars or pipe from files.

2. **Setting `MCP_API_KEY_WRITE` on Netlify** or in the cloud dev
   environment ("Biga frontend"). Both only read. The write key there
   enlarges the blast radius. The one sanctioned write-key environment is
   the dedicated authoring environment (2FI-641), with the limits listed
   there: one secret, `/tools/call` only, no coding.

3. **Direct Supabase host in `DATABASE_URL`.** Fails DNS on most home
   networks. Always use the Session pooler URL.

4. **Rebuilding the inventory from memory.** The 2026-10-22 incident
   inventory missed Netlify, misclassified `INDEXNOW_SUBMIT_KEY` as "not a
   secret", and missed the cloud dev environment, all of which were (or
   should have been) in this file. Start every rotation from this file.

5. **Trusting a value's length or shape.** An 18-character password was
   taken for an `sb_secret_` key, and Railway ran with a key Supabase
   didn't recognize for hours. The May 7 incident (2FI-253) made the same
   mistake with password lengths. Verify identity against the issuer.

6. **Keeping "just in case" copies.** Every extra `.env` or config file is
   another place to rotate and another place to leak. Delete copies that
   nothing uses instead of updating them.

7. **Editing a cloud network secret and not re-testing every host.** On
   2026-10-23 the read-key secret was "verified" on the Railway host only;
   `mcp.accidentalrecipes.com` returned 401 for days. On 2026-10-28 the
   re-added secret was saved with the path `/toos/call`, which made the
   proxy return 403. Secrets can't be edited in place: delete, re-add,
   check the path spelling, then probe **each** host from a **fresh**
   session started in that environment.

8. **Purging in the wrong OneDrive account.** The browser defaulted to an
   outlook.com account while the Mac syncs the 2findmarketing account, so
   the first recycle-bin purge did nothing. Check the account email in both
   places before purging (2FI-673).

---

## Rotation log

| Date | What | Ticket |
|---|---|---|
| 2026-05-07 | `DATABASE_URL` (password reset; stale Claude Desktop copy found) | 2FI-253 |
| 2026-10-22 | Supabase legacy JWT keys disabled, legacy HS256 secret revoked, old secret key deleted | 2FI-642 |
| 2026-10-23 | `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MCP_API_KEY_WRITE`, `MCP_API_KEY_READ` (twice), `INDEXNOW_SUBMIT_KEY` | 2FI-642 |

---

## Related tickets
- 2FI-642 — Railway incident rotation (2026-10-22/23)
- 2FI-253 — Credential management hardening (umbrella, May 7)
- 2FI-641 — "Biga content" cloud environment with the write key
- 2FI-656 — Retire local Biga
- 2FI-659 — MCP host move to `mcp.accidentalrecipes.com`; cloud network secret per host
- 2FI-670 / 2FI-671 / 2FI-672 / 2FI-673 — Mac mini follow-ups (backup codes, Screaming Frog key, stale OneDrive copy, OneDrive accounts)
- 2FI-205 — Biga-MCP HTTP auth introduction (created the read/write key split)
- 2FI-241 — Tightened the per-tool permission map on `/tools/call`
- 2FI-100 — HTTP transport selection (introduced `MCP_SERVER_URL`)
- 2FI-178 — Sentry wiring (introduced `SENTRY_AUTH_TOKEN` requirement)
- 2FI-215 — Image storage (introduced `SUPABASE_SERVICE_ROLE_KEY` need)
