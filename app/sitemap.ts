import type { MetadataRoute } from 'next';
import { searchContent, listIngredients } from '@/lib/mcp-client';
import { siteConfig } from '@/lib/site-config';

/**
 * Dynamic sitemap — queries MCP for all published content.
 *
 * Portable: uses siteConfig.url for the base, MCP client for data.
 * To adapt for another Biga site, only siteConfig needs to change.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;

  const [rawRecipes, rawIngredients] = await Promise.all([
    searchContent(undefined, undefined, undefined, 200).catch(() => []),
    listIngredients().catch(() => []),
  ]);

  const recipes = normalize(rawRecipes);
  const ingredients = normalize(rawIngredients);

  const entries: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/ingredients`, changeFrequency: 'weekly', priority: 0.6 },
  ];

  for (const r of recipes) {
    if (r.slug) {
      entries.push({
        url: `${base}/recipes/${r.slug}`,
        changeFrequency: 'monthly',
        priority: 0.8,
      });
    }
  }

  for (const i of ingredients) {
    if (i.wikidata_id) {
      entries.push({
        url: `${base}/ingredients/${i.wikidata_id}`,
        changeFrequency: 'monthly',
        priority: 0.5,
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
