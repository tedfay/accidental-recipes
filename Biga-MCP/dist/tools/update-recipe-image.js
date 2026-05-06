/**
 * MCP tool: update_recipe_image (2FI-215)
 *
 * Downloads an image from a source URL, optionally writes embedded
 * metadata (EXIF on JPEG), uploads to Supabase Storage, and merges the
 * resulting entry into the recipe's `images` JSONB field.
 *
 * Stores storage_path (not URL); public URLs are composed at read time.
 */
import { sql } from '../db.js';
import { getRecipe } from './get-recipe.js';
import { validateUpdateRecipeImage } from './validation.js';
import { uploadImageToStorage } from '../utils/storage.js';
import { generateAltText } from '../utils/alt-text.js';
import { notifyIndexNow } from '../hooks/notify-indexnow.js';
const DOWNLOAD_TIMEOUT_MS = 30_000;
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB — matches bucket file-size limit
export async function updateRecipeImage(input) {
    const errors = validateUpdateRecipeImage(input);
    if (errors.length > 0) {
        return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'Validation failed', details: errors }) }],
        };
    }
    const [existing] = await sql `
    SELECT id, images, ingredients, meta->>'titleOverride' AS title
    FROM recipes WHERE slug = ${input.slug} LIMIT 1
  `;
    if (!existing) {
        return {
            content: [{ type: 'text', text: JSON.stringify({ error: `No recipe found with slug: ${input.slug}` }) }],
        };
    }
    const alt = input.alt ?? generateAltText({
        title: existing['title'] ?? input.slug.replace(/-/g, ' '),
        ingredients: existing['ingredients'] ?? [],
    });
    // Download with timeout + size cap.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
    let buffer;
    try {
        const response = await fetch(input.url, { signal: controller.signal });
        if (!response.ok) {
            return {
                content: [{ type: 'text', text: JSON.stringify({ error: `Failed to download image: HTTP ${response.status}` }) }],
            };
        }
        // Cheap pre-check via Content-Length when present.
        const contentLength = response.headers.get('content-length');
        if (contentLength && Number(contentLength) > MAX_BYTES) {
            return {
                content: [{ type: 'text', text: JSON.stringify({ error: `Image too large: ${contentLength} bytes (max ${MAX_BYTES})` }) }],
            };
        }
        // Stream and abort if total exceeds cap (defends against missing or lying Content-Length).
        if (!response.body) {
            return {
                content: [{ type: 'text', text: JSON.stringify({ error: 'Empty response body' }) }],
            };
        }
        const chunks = [];
        let total = 0;
        const reader = response.body.getReader();
        while (true) {
            const { value, done } = await reader.read();
            if (done)
                break;
            total += value.byteLength;
            if (total > MAX_BYTES) {
                controller.abort();
                return {
                    content: [{ type: 'text', text: JSON.stringify({ error: `Image exceeds max size of ${MAX_BYTES} bytes` }) }],
                };
            }
            chunks.push(value);
        }
        buffer = Buffer.concat(chunks);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return {
            content: [{ type: 'text', text: JSON.stringify({ error: `Image download failed: ${message}` }) }],
        };
    }
    finally {
        clearTimeout(timeout);
    }
    let imageEntry;
    try {
        imageEntry = await uploadImageToStorage(input.slug, input.role, buffer, {
            alt,
            width: input.width,
            height: input.height,
            mime_type: input.mime_type,
            source: input.source,
            attribution: input.attribution,
            embedded_metadata: input.embedded_metadata,
        }, 'recipes', { force: input.force ?? false });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return {
            content: [{ type: 'text', text: JSON.stringify({ error: `Upload failed: ${message}` }) }],
        };
    }
    const currentImages = existing['images'] ?? {};
    const updatedImages = { ...currentImages, [input.role]: imageEntry };
    await sql `
    UPDATE recipes
    SET images = ${sql.json(updatedImages)}, updated_at = now()
    WHERE slug = ${input.slug}
  `;
    notifyIndexNow([input.slug]);
    return getRecipe(input.slug);
}
