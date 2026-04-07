import type { IngredientEntity, IngredientSummary } from '@/types/ingredient';
import type { Recipe, SearchResult } from '@/types/recipe';
import { callMcpTool } from './mcp-transport';

/**
 * MCP client for the Biga server.
 *
 * Thin wrappers around callMcpTool that add type signatures.
 * Transport selection (HTTP vs stdio) is handled by mcp-transport.ts.
 *
 * Server components and the API route both use these functions.
 * No self-fetch, no localhost — calls go directly to the transport layer.
 */

export async function getRecipe(slug: string): Promise<Recipe> {
  return callMcpTool<Recipe>('get_recipe', { slug });
}

/**
 * Returns Schema.org Recipe JSON-LD blob for direct injection.
 * The frontend injects this verbatim — it does not modify the shape.
 */
export async function getSeoMetadata(slug: string): Promise<Record<string, unknown>> {
  return callMcpTool<Record<string, unknown>>('get_seo_metadata', { slug });
}

export async function getIngredient(wikidataId: string): Promise<IngredientEntity> {
  return callMcpTool<IngredientEntity>('get_ingredient', { wikidataId });
}

export async function listIngredients(): Promise<IngredientSummary[]> {
  return callMcpTool<IngredientSummary[]>('list_ingredients');
}

export async function getRecipesByIngredient(
  wikidataIds: string[],
  limit: number = 56,
): Promise<SearchResult[]> {
  return callMcpTool<SearchResult[]>('get_recipes_by_ingredient', { wikidataIds, limit });
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
  return callMcpTool<SearchResult[]>('search_content', args);
}

export async function getIngredientFrequencies(): Promise<Record<string, number>> {
  return callMcpTool<Record<string, number>>('get_ingredient_frequencies');
}
