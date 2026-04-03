import { sql } from '../db.js';

/**
 * Returns all live recipes containing ALL specified ingredients (AND logic).
 *
 * Query path: resolves Wikidata IDs → ingredient UUIDs, then uses the
 * main_ingredients UUID[] column with GIN index for containment (@>).
 *
 * If main_ingredients is not populated on live recipes, this will return
 * empty results — switch to the JSONB jsonb_array_elements fallback
 * documented in the Phase 2 handoff (2FI-132).
 */
export async function getRecipesByIngredient(
  wikidataIds: string[],
  limit: number,
): Promise<{ content: { type: 'text'; text: string }[] }> {
  // Resolve Wikidata IDs to ingredient UUIDs
  const ingredients = await sql`
    SELECT id FROM ingredients WHERE wikidata_id = ANY(${wikidataIds}::text[])
  `;

  const ingredientUuids = ingredients.map((r) => r.id as string);

  // If none of the provided Wikidata IDs resolved, return empty
  if (ingredientUuids.length === 0) {
    return { content: [{ type: 'text', text: '[]' }] };
  }

  // AND logic: recipe must contain ALL specified ingredients.
  // Uses main_ingredients UUID[] column with GIN index.
  const results = await sql`
    SELECT
      r.slug,
      r.meta->>'titleOverride' AS title,
      r.headnote,
      jsonb_array_length(r.ingredients) AS ingredient_count,
      NULL::float AS rank
    FROM recipes r
    WHERE r.status = 'live'
      AND r.main_ingredients @> ${ingredientUuids}::uuid[]
    ORDER BY r.meta->>'titleOverride' ASC
    LIMIT ${limit}
  `;

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(results, null, 2),
      },
    ],
  };
}
