import { sql } from '../db.js';

interface IngredientRow {
  id: string;
  name: string;
  wikidata_id: string;
  category: string;
  alternate_names: string[];
  wikipedia_url: string | null;
  seasonality: unknown | null;
  nutrition: unknown | null;
  common_substitutes: unknown[];
  sources: unknown[];
}

interface RecipeRef {
  slug: string;
  title: string;
}

export async function getIngredient(
  wikidataId: string,
): Promise<{ content: { type: 'text'; text: string }[] }> {
  // Look up the ingredient entity by Wikidata ID
  const rows = await sql<IngredientRow[]>`
    SELECT id, name, wikidata_id, category, alternate_names,
           wikipedia_url, seasonality, nutrition, common_substitutes, sources
    FROM ingredients
    WHERE wikidata_id = ${wikidataId}
    LIMIT 1
  `;

  const ingredient = rows[0];
  if (!ingredient) {
    return {
      content: [{ type: 'text', text: `No ingredient found with Wikidata ID: ${wikidataId}` }],
    };
  }

  // Find all live recipes that reference this ingredient by ingredientId
  const recipes = await sql<RecipeRef[]>`
    SELECT slug, meta->>'titleOverride' AS title
    FROM recipes
    WHERE status = 'live'
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(ingredients) AS ing
        WHERE ing->>'ingredientId' = ${ingredient.id}
      )
    ORDER BY slug
  `;

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          ...ingredient,
          alternate_names: Array.isArray(ingredient.alternate_names) ? ingredient.alternate_names : [],
          recipes,
        }, null, 2),
      },
    ],
  };
}
