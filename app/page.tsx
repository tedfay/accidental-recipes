import { searchRecipes, listIngredients, getIngredientFrequencies } from '@/lib/mcp-client';
import HomePageClient from '@/components/HomePageClient';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let recipes: Awaited<ReturnType<typeof searchRecipes>> = [];
  let ingredients: Awaited<ReturnType<typeof listIngredients>> = [];
  let frequencyMap: Awaited<ReturnType<typeof getIngredientFrequencies>> = {};

  try {
    [recipes, ingredients, frequencyMap] = await Promise.all([
      searchRecipes('', 56),
      listIngredients(),
      getIngredientFrequencies(),
    ]);
  } catch {
    // MCP server unreachable at build time — render with empty data.
    // At runtime, data will be fetched dynamically (force-dynamic).
  }

  return (
    <HomePageClient
      initialRecipes={recipes}
      ingredients={ingredients}
      frequencyMap={frequencyMap}
    />
  );
}
