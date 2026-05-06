/**
 * Supabase SDK client for Storage operations only.
 * Database access continues via postgres.js in db.ts.
 *
 * Lazy-initialized: does not throw at module load if env vars are missing.
 * This prevents breaking local dev workflows that don't use image tools.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getStorageClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];

  if (!url) throw new Error('SUPABASE_URL is not set');
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');

  _client = createClient(url, key, {
    auth: { persistSession: false },
  });

  return _client;
}
