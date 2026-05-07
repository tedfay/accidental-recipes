/**
 * Canonical TypeScript interfaces for the `images` JSONB schema on
 * recipes, articles, and any future Biga content object (2FI-215).
 *
 * Storage is content-type-agnostic. Same shape applies for
 * recipes/{slug}/{filename}, articles/{slug}/{filename}, etc.
 *
 * URLs are NOT stored. `storage_path` is stored; the public URL is
 * resolved at read time so a future CDN swap doesn't require a backfill.
 */

export type ImageSourceType = 'ai_generated' | 'stock' | 'original' | 'imported';

export interface ImageSource {
  type: ImageSourceType;
  // AI-generated fields
  model?: string;
  provider?: string;
  prompt?: string;
  generated_at?: string;
  generated_by?: string;
  // Stock / original fields
  credit?: string;
  license?: string;
}

export interface ImageAttribution {
  text: string;
  display: boolean;
}

/**
 * File-level metadata embedded in the binary at upload time.
 * Named `embedded_metadata` (not `iptc`) because the writer uses EXIF
 * tags (Artist/Copyright/ImageDescription) — the spirit is IPTC, the
 * implementation is EXIF. JPEG only; non-JPEG uploads skip this.
 */
export interface ImageEmbeddedMetadata {
  credit: string;
  source: string;
  copyright: string;
}

export interface ImageEntry {
  /**
   * Path within the storage bucket — e.g.
   * "recipes/slow-cooker-tacos/slow-cooker-tacos-hero.jpg".
   * Public URL is composed at read time from
   * `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storage_path}`.
   */
  storage_path: string;
  filename: string;
  alt: string;
  width: number;
  height: number;
  mime_type: string;
  /** Hex sha256 of the bytes as stored (post-EXIF rewrite). */
  sha256: string;
  source: ImageSource;
  attribution: ImageAttribution;
  /** Embedded metadata as written into the file, when applicable. */
  embedded_metadata?: ImageEmbeddedMetadata;
  /** True iff embedded_metadata was requested but skipped (non-JPEG). */
  embedded_metadata_skipped?: boolean;
  uploaded_at: string;
}

/** Role values: "hero" now; "thumb" and "og" reserved for future use. */
export type ImageRole = 'hero' | string;

/** The `images` JSONB column shape — keyed by role. */
export type ImagesJsonb = Record<ImageRole, ImageEntry>;
