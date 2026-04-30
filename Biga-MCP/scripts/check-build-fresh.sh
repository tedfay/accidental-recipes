#!/usr/bin/env bash
# Verify Biga-MCP/dist/ is up-to-date with Biga-MCP/src/.
#
# Run from repo root or from Biga-MCP/. Exits 0 if dist matches what
# `npm run build` would produce, exits 1 otherwise.
#
# Why: production ships from dist/ (no separate publish step), so any
# src/ change that isn't reflected in dist/ silently regresses on the
# next rebuild. Two prior incidents (IndexNow hooks; updated_at in
# search-content) lost work this way.
#
# Use as a pre-commit guard or as a CI check on PRs that touch
# Biga-MCP/src/ or Biga-MCP/dist/.

set -euo pipefail

# Resolve to Biga-MCP directory regardless of where script is invoked
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_DIR="$(dirname "$SCRIPT_DIR")"

cd "$MCP_DIR"

# Capture the current dist tree hash
before="$(git ls-files -s dist/ | git hash-object --stdin)"

# Rebuild into a temp dist and compare
tmp_out="$(mktemp -d)"
trap 'rm -rf "$tmp_out"' EXIT

npx tsc --outDir "$tmp_out" >/dev/null

# Diff temp build against committed dist (ignore CRLF/whitespace —
# postgres.js Windows checkouts add CRLF on rebuild, but git stores LF).
if ! diff -r --strip-trailing-cr "$tmp_out" dist >/dev/null; then
  echo "ERROR: Biga-MCP/dist/ is stale relative to Biga-MCP/src/." >&2
  echo "Run 'npm run build' inside Biga-MCP/ and commit the dist/ changes." >&2
  echo "" >&2
  echo "Files that would change on rebuild:" >&2
  diff -r --strip-trailing-cr --brief "$tmp_out" dist >&2 || true
  exit 1
fi

echo "Biga-MCP/dist/ is in sync with src/."
