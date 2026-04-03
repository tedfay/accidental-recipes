import { searchRecipes, listIngredients, getIngredientFrequencies } from '@/lib/mcp-client';
import HomePageClient from '@/components/HomePageClient';
import McpError from '@/components/McpError';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let recipes: Awaited<ReturnType<typeof searchRecipes>> = [];
  let ingredients: Awaited<ReturnType<typeof listIngredients>> = [];
  let frequencyMap: Awaited<ReturnType<typeof getIngredientFrequencies>> = {};
  let loadError: string | null = null;

  try {
    [recipes, ingredients, frequencyMap] = await Promise.all([
      searchRecipes('', 56),
      listIngredients(),
      getIngredientFrequencies(),
    ]);
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'MCP server unreachable';
    console.error('[MCP] Home page data load failed:', loadError);
  }

  if (loadError && recipes.length === 0) {
    return <McpError error={loadError} />;
  }

  return (
    <HomePageClient
      initialRecipes={recipes}
      ingredients={ingredients}
      frequencyMap={frequencyMap}
    />
  );
}
