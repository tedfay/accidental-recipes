/**
 * Image file naming and storage path utilities.
 *
 * Pattern: {slug}-{role}.{ext}
 * Path:    {contentType}/{slug}/{filename}
 */

export function generateImageFilename(
  slug: string,
  role: string,
  ext: string,
): string {
  return `${slug}-${role}.${ext.replace(/^\./, '')}`;
}

export function generateStoragePath(
  slug: string,
  filename: string,
  contentType: string = 'recipes',
): string {
  return `${contentType}/${slug}/${filename}`;
}
