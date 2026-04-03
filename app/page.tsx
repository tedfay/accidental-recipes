import { searchRecipes, listIngredients, getIngredientFrequencies } from '@/lib/mcp-client';
import HomePageClient from '@/components/HomePageClient';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [recipes, ingredients, frequencyMap] = await Promise.all([
    searchRecipes('', 56),
    listIngredients(),
    getIngredientFrequencies(),
  ]);

  return (
    <HomePageClient
      initialRecipes={recipes}
      ingredients={ingredients}
      frequencyMap={frequencyMap}
    />
  );
}
