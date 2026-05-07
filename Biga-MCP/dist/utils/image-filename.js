/**
 * Image file naming and storage path utilities.
 *
 * Pattern: {slug}-{role}.{ext}
 * Path:    {contentType}/{slug}/{filename}
 */
export function generateImageFilename(slug, role, ext) {
    return `${slug}-${role}.${ext.replace(/^\./, '')}`;
}
export function generateStoragePath(slug, filename, contentType = 'recipes') {
    return `${contentType}/${slug}/${filename}`;
}
