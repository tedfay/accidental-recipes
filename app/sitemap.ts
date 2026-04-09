import type { MetadataRoute } from 'next';
import { searchContent, listIngredients } from '@/lib/mcp-client';
import { siteConfig } from '@/lib/site-config';

/**
 * Dynamic sitemap — queries MCP for all published content.
 *
 * Uses lastmod as the sole meaningful signal (Google ignores changeFrequency
 * and priority entirely). Portable: uses siteConfig.url for the base,
 * MCP client for data. To adapt for another Biga site, only siteConfig
 * needs to change.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;

  const [rawRecipes, rawIngredients] = await Promise.all([
    searchContent(undefined, undefined, undefined, 200).catch((err) => {
      console.error('[sitemap] MCP searchContent failed:', err);
      return [];
    }),
    listIngredients().catch((err) => {
      console.error('[sitemap] MCP listIngredients failed:', err);
      return [];
    }),
  ]);

  const recipes = normalize(rawRecipes);
  const ingredients = normalize(rawIngredients);

  // Derive lastModified for static pages from the most recent recipe timestamp
  const latestRecipeDate = recipes.reduce<string | null>((latest, r) => {
    const ts = (r.updated_at as string) ?? (r.created_at as string) ?? null;
    if (!ts) return latest;
    return !latest || ts > latest ? ts : latest;
  }, null);

  const entries: MetadataRoute.Sitemap = [
    {
      url: base,
      ...(latestRecipeDate ? { lastModified: new Date(latestRecipeDate) } : {}),
    },
    {
      url: `${base}/ingredients`,
      ...(latestRecipeDate ? { lastModified: new Date(latestRecipeDate) } : {}),
    },
  ];

  for (const r of recipes) {
    if (r.slug) {
      const ts = (r.updated_at as string) ?? (r.created_at as string) ?? null;
      entries.push({
        url: `${base}/recipes/${r.slug}`,
        ...(ts ? { lastModified: new Date(ts) } : {}),
      });
    }
  }

  for (const i of ingredients) {
    if (i.wikidata_id) {
      entries.push({
        url: `${base}/ingredients/${i.wikidata_id}`,
      });
    }
  }

  return entries;
}

/** Coerce MCP response to an array — handles string, array, or wrapper object. */
function normalize(raw: unknown): Record<string, unknown>[] {
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch { return []; }
  }
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const first = Object.values(raw).find(Array.isArray);
    if (first) return first;
  }
  return [];
}
