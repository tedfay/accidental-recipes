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
export {};
