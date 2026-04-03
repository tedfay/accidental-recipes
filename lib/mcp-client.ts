import type { IngredientEntity, IngredientSummary } from '@/types/ingredient';
import type { Recipe, SearchResult } from '@/types/recipe';

/**
 * MCP client for the Biga server.
 *
 * In local dev, calls the Next.js API route at /api/mcp which spawns the
 * Biga-MCP server process over stdio. This is the only transport available
 * today (production transport is unresolved per 2FI-100).
 *
 * Server components call these functions directly. The internal fetch to
 * the API route uses the Next.js server-side fetch with no caching by
 * default (dynamic data from the database).
 */

const MCP_API_URL =
  process.env['MCP_API_URL'] ??
  `http://localhost:${process.env['PORT'] ?? '3000'}/api/mcp`;

/** Temporary ceiling until 2FI-125 resolves list_recipes */
export const RECIPE_FETCH_LIMIT = 999;

async function callTool<T>(tool: string, args: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(MCP_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool, args }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MCP call failed: ${tool} — ${res.status} ${res.statusText}: ${body}`);
  }

  return res.json() as Promise<T>;
}

export async function getRecipe(slug: string): Promise<Recipe> {
  return callTool<Recipe>('get_recipe', { slug });
}

export async function searchRecipes(query: string, limit: number = RECIPE_FETCH_LIMIT): Promise<SearchResult[]> {
  return callTool<SearchResult[]>('search_recipes', { query, limit });
}

/**
 * Returns Schema.org Recipe JSON-LD blob for direct injection.
 * The frontend injects this verbatim — it does not modify the shape.
 */
export async function getSeoMetadata(slug: string): Promise<Record<string, unknown>> {
  return callTool<Record<string, unknown>>('get_seo_metadata', { slug });
}

export async function getIngredient(wikidataId: string): Promise<IngredientEntity> {
  return callTool<IngredientEntity>('get_ingredient', { wikidataId });
}

export async function listIngredients(): Promise<IngredientSummary[]> {
  return callTool<IngredientSummary[]>('list_ingredients');
}

export async function getRecipesByIngredient(
  wikidataIds: string[],
  limit: number = 56,
): Promise<SearchResult[]> {
  return callTool<SearchResult[]>('get_recipes_by_ingredient', { wikidataIds, limit });
}

export async function searchContent(
  query?: string,
  includeIds?: string[],
  excludeIds?: string[],
  limit: number = 50,
): Promise<SearchResult[]> {
  const args: Record<string, unknown> = { limit };
  if (query) args.query = query;
  if (includeIds && includeIds.length > 0) args.include_ids = includeIds;
  if (excludeIds && excludeIds.length > 0) args.exclude_ids = excludeIds;
  return callTool<SearchResult[]>('search_content', args);
}

export async function getIngredientFrequencies(): Promise<Record<string, number>> {
  return callTool<Record<string, number>>('get_ingredient_frequencies');
}
