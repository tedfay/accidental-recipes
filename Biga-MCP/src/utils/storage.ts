/**
 * Supabase Storage upload utility (2FI-215).
 *
 * Bucket: recipe-images (created via Supabase Dashboard)
 * Path pattern: {contentType}/{slug}/{filename}
 * Access: public read, service-role write
 *
 * Stores `storage_path` only — public URL is composed at read time.
 *
 * Expected bucket configuration:
 *   - Name: recipe-images
 *   - Public: true
 *   - File size limit: 10 MB
 *   - Allowed MIME types: image/jpeg, image/png, image/webp
 */

import { createHash } from 'node:crypto';
import { getStorageClient } from '../storage-client.js';
import { generateImageFilename, generateStoragePath } from './image-filename.js';
import { writeEmbeddedMetadata } from './iptc.js';
import type {
  ImageSource,
  ImageAttribution,
  ImageEmbeddedMetadata,
  ImageEntry,
} from '../types/images.js';

export const BUCKET = 'recipe-images';

export interface UploadMetadata {
  alt: string;
  width: number;
  height: number;
  mime_type: string;
  source: ImageSource;
  attribution: ImageAttribution;
  /** When provided and mime_type is image/jpeg, written into the file. */
  embedded_metadata?: ImageEmbeddedMetadata;
}

export interface UploadOptions {
  force?: boolean;
}

export async function uploadImageToStorage(
  slug: string,
  role: string,
  buffer: Buffer,
  metadata: UploadMetadata,
  contentType: string = 'recipes',
  options: UploadOptions = {},
): Promise<ImageEntry> {
  const supabase = getStorageClient();

  const ext = metadata.mime_type === 'image/png' ? 'png'
    : metadata.mime_type === 'image/webp' ? 'webp'
    : 'jpg';

  const filename = generateImageFilename(slug, role, ext);
  const storagePath = generateStoragePath(slug, filename, contentType);

  // Embedded metadata: JPEG only. Skip silently for png/webp; surface via
  // embedded_metadata_skipped on the entry so callers know.
  let finalBuffer = buffer;
  let embeddedSkipped = false;
  if (metadata.embedded_metadata) {
    if (metadata.mime_type === 'image/jpeg') {
      try {
        finalBuffer = writeEmbeddedMetadata(buffer, metadata.embedded_metadata);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.warn(`Embedded-metadata write failed for ${storagePath} (non-blocking): ${msg}`);
        // Continue with original buffer — write failure is non-blocking.
      }
    } else {
      embeddedSkipped = true;
    }
  }

  const sha256 = createHash('sha256').update(finalBuffer).digest('hex');

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, finalBuffer, {
      contentType: metadata.mime_type,
      upsert: options.force ?? false,
    });

  if (error) {
    throw new Error(`Storage upload failed for ${storagePath}: ${error.message}`);
  }

  const entry: ImageEntry = {
    storage_path: storagePath,
    filename,
    alt: metadata.alt,
    width: metadata.width,
    height: metadata.height,
    mime_type: metadata.mime_type,
    sha256,
    source: metadata.source,
    attribution: metadata.attribution,
    uploaded_at: new Date().toISOString(),
  };

  if (metadata.embedded_metadata && !embeddedSkipped) {
    entry.embedded_metadata = { ...metadata.embedded_metadata };
  }
  if (embeddedSkipped) {
    entry.embedded_metadata_skipped = true;
  }

  return entry;
}
