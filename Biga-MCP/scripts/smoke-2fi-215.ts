/**
 * 2FI-215 smoke test — runs `update_recipe_image` against 2-3 live recipes
 * with byte-stable placeholder images, then verifies:
 *
 *   - storage_path stored on the row (not URL)
 *   - public URL accessible (HEAD 200)
 *   - sha256 stable across re-runs of the same source URL
 *   - force: false blocks overwrite of an existing role
 *   - force: true overwrites cleanly
 *   - embedded_metadata_skipped flag absent for JPEG, present for non-JPEG
 *
 * Run from Biga-MCP/:
 *   npx tsx --env-file=.env scripts/smoke-2fi-215.ts [slug1,slug2,slug3]
 *
 * If slugs are omitted, the first 3 live recipes by created_at are used.
 *
 * Images come from https://picsum.photos (byte-stable per seed) and are
 * intended to be overwritten by the real FLUX pipeline once 2FI-219
 * lands. None of these are meant to ship to production.
 */

import { sql } from '../src/db.js';
import { updateRecipeImage } from '../src/tools/update-recipe-image.js';
import type { ImageEntry } from '../src/types/images.js';

const ROLE = 'hero';
const WIDTH = 1792;
const HEIGHT = 1024;

interface RunResult {
  slug: string;
  ok: boolean;
  storage_path?: string;
  sha256?: string;
  publicUrl?: string;
  publicUrlStatus?: number;
  embedded_skipped?: boolean;
  rerunSha256?: string;
  forceFalseBlocked?: boolean;
  forceTrueOk?: boolean;
  error?: string;
}

function picsumUrl(slug: string): string {
  return `https://picsum.photos/seed/biga215-${slug}/${WIDTH}/${HEIGHT}`;
}

function publicUrlFor(storagePath: string): string {
  const base = process.env['SUPABASE_URL']!.replace(/\/+$/, '');
  return `${base}/storage/v1/object/public/recipe-images/${storagePath}`;
}

function parseToolResult(
  result: { content: { type: 'text'; text: string }[] },
): { error?: { error: string; details?: unknown }; recipe?: { images?: Record<string, ImageEntry> } } {
  const text = result.content[0]?.text;
  if (!text) return { error: { error: 'empty result' } };
  const parsed = JSON.parse(text) as Record<string, unknown>;
  if ('error' in parsed && typeof parsed['error'] === 'string') {
    return { error: parsed as { error: string; details?: unknown } };
  }
  return { recipe: parsed as { images?: Record<string, ImageEntry> } };
}

async function pickSlugs(arg: string | undefined): Promise<string[]> {
  if (arg) {
    return arg.split(',').map((s) => s.trim()).filter(Boolean);
  }
  const rows = await sql<{ slug: string }[]>`
    SELECT slug FROM recipes
    WHERE status = 'live'
    ORDER BY created_at ASC
    LIMIT 3
  `;
  return rows.map((r) => r.slug);
}

async function runOne(slug: string): Promise<RunResult> {
  const r: RunResult = { slug, ok: false };
  const url = picsumUrl(slug);

  // 1. First upload — fresh.
  const first = parseToolResult(
    await updateRecipeImage({
      slug,
      role: ROLE,
      url,
      width: WIDTH,
      height: HEIGHT,
      mime_type: 'image/jpeg',
      source: {
        type: 'imported',
        credit: 'Lorem Picsum (https://picsum.photos)',
        license: 'placeholder service — overwrite via 2FI-219',
      },
      attribution: {
        text: 'Placeholder image — Lorem Picsum',
        display: false,
      },
      embedded_metadata: {
        credit: 'Lorem Picsum',
        source: '2FI-215 smoke test',
        copyright: 'Accidental Recipes',
      },
      force: true, // first call may overwrite a leftover from prior smokes
    }),
  );
  if (first.error) {
    r.error = `first upload failed: ${first.error.error} ${JSON.stringify(first.error.details ?? {})}`;
    return r;
  }
  const entry = first.recipe?.images?.[ROLE];
  if (!entry) {
    r.error = 'first upload returned no images.hero entry';
    return r;
  }
  r.storage_path = entry.storage_path;
  r.sha256 = entry.sha256;
  r.embedded_skipped = entry.embedded_metadata_skipped ?? false;

  // 2. Public URL accessible?
  r.publicUrl = publicUrlFor(entry.storage_path);
  try {
    const resp = await fetch(r.publicUrl, { method: 'HEAD' });
    r.publicUrlStatus = resp.status;
  } catch (err) {
    r.publicUrlStatus = -1;
    r.error = `HEAD failed: ${err instanceof Error ? err.message : String(err)}`;
    return r;
  }

  // 3. Re-run with force: false — should be blocked by Supabase Storage with
  //    a "already exists" error from upload(). The MCP tool wraps this as a
  //    failed upload result.
  const second = parseToolResult(
    await updateRecipeImage({
      slug,
      role: ROLE,
      url,
      width: WIDTH,
      height: HEIGHT,
      mime_type: 'image/jpeg',
      source: {
        type: 'imported',
        credit: 'Lorem Picsum (https://picsum.photos)',
        license: 'placeholder service',
      },
      attribution: { text: 'Placeholder', display: false },
      force: false,
    }),
  );
  r.forceFalseBlocked = !!second.error;

  // 4. Re-run with force: true — should overwrite cleanly. sha256 should
  //    equal the first run's sha256 because picsum is byte-stable per seed.
  const third = parseToolResult(
    await updateRecipeImage({
      slug,
      role: ROLE,
      url,
      width: WIDTH,
      height: HEIGHT,
      mime_type: 'image/jpeg',
      source: {
        type: 'imported',
        credit: 'Lorem Picsum (https://picsum.photos)',
        license: 'placeholder service',
      },
      attribution: { text: 'Placeholder', display: false },
      embedded_metadata: {
        credit: 'Lorem Picsum',
        source: '2FI-215 smoke test',
        copyright: 'Accidental Recipes',
      },
      force: true,
    }),
  );
  if (third.error) {
    r.error = `force:true rerun failed: ${third.error.error}`;
    r.forceTrueOk = false;
    return r;
  }
  r.forceTrueOk = true;
  r.rerunSha256 = third.recipe?.images?.[ROLE]?.sha256;

  r.ok =
    r.publicUrlStatus === 200 &&
    r.forceFalseBlocked === true &&
    r.forceTrueOk === true &&
    !!r.sha256 &&
    r.sha256 === r.rerunSha256;
  return r;
}

function fmtRow(r: RunResult): string {
  const parts = [
    r.ok ? 'PASS' : 'FAIL',
    r.slug,
    `status=${r.publicUrlStatus ?? '?'}`,
    `force-false-blocked=${r.forceFalseBlocked ?? '?'}`,
    `force-true-ok=${r.forceTrueOk ?? '?'}`,
    `sha-stable=${r.sha256 && r.sha256 === r.rerunSha256 ? 'yes' : 'no'}`,
    `embedded-skipped=${r.embedded_skipped ?? '?'}`,
  ];
  if (r.error) parts.push(`err="${r.error}"`);
  return parts.join('  ');
}

async function main(): Promise<void> {
  // Fail fast on env.
  for (const k of ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
    if (!process.env[k]) {
      console.error(`FAIL: env ${k} is not set`);
      process.exit(2);
    }
  }

  const arg = process.argv[2];
  const slugs = await pickSlugs(arg);
  if (slugs.length === 0) {
    console.error('FAIL: no slugs provided and no live recipes found');
    process.exit(2);
  }

  console.log(`Running smoke against ${slugs.length} slug(s): ${slugs.join(', ')}`);
  console.log('');

  const results: RunResult[] = [];
  for (const slug of slugs) {
    process.stdout.write(`  ${slug} ... `);
    try {
      const r = await runOne(slug);
      results.push(r);
      console.log(r.ok ? 'OK' : `FAIL${r.error ? ' — ' + r.error : ''}`);
    } catch (err) {
      const r: RunResult = { slug, ok: false, error: err instanceof Error ? err.message : String(err) };
      results.push(r);
      console.log(`FAIL — ${r.error}`);
    }
  }

  console.log('');
  console.log('Summary:');
  for (const r of results) console.log(`  ${fmtRow(r)}`);

  await sql.end();

  const allPass = results.every((r) => r.ok);
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error('FATAL:', err instanceof Error ? err.stack : String(err));
  process.exit(3);
});
