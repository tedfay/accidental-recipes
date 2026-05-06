/**
 * Image URL resolution (2FI-215).
 *
 * Recipe rows store `storage_path` only; the public URL is composed at
 * read time. This indirection means a CDN swap or bucket move is a
 * config change, not a database backfill.
 *
 * URL shape:
 *   ${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storage_path}
 *
 * The bucket name matches Biga-MCP/src/utils/storage.ts BUCKET constant.
 */

import type { ImageEntry, ImagesJsonb } from '@/types/recipe';

const BUCKET = 'recipe-images';

/**
 * Compose the public URL for a stored image.
 * Returns null when SUPABASE_URL is unset (local dev without storage).
 */
export function resolveImageUrl(storagePath: string): string | null {
  const base = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  if (!base) return null;
  // Trim trailing slash defensively.
  const trimmed = base.replace(/\/+$/, '');
  return `${trimmed}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

/** Convenience: get the URL for a specific role on a recipe. */
export function getImageUrl(images: ImagesJsonb | null, role: string = 'hero'): string | null {
  const entry = images?.[role];
  if (!entry) return null;
  return resolveImageUrl(entry.storage_path);
}

/** Convenience: get the full entry (including alt, dimensions, etc.) for a role. */
export function getImageEntry(images: ImagesJsonb | null, role: string = 'hero'): ImageEntry | null {
  return images?.[role] ?? null;
}
