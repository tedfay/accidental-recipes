import { sql } from '../db.js';
/**
 * Returns a frequency map of ingredient usage across live recipes.
 * Keyed by wikidata_id, valued by recipe count.
 *
 * Uses the main_ingredients UUID[] column with GIN index for
 * containment checks against each ingredient's UUID.
 */
export async function getIngredientFrequencies() {
    const rows = await sql `
    SELECT
      i.wikidata_id,
      COUNT(r.id)::int AS recipe_count
    FROM ingredients i
    JOIN recipes r
      ON r.status = 'live'
      AND r.main_ingredients @> ARRAY[i.id]
    WHERE i.wikidata_id IS NOT NULL
    GROUP BY i.wikidata_id
  `;
    const frequencyMap = {};
    for (const row of rows) {
        frequencyMap[row.wikidata_id] = row.recipe_count;
    }
    return {
        content: [
            {
                type: 'text',
                text: JSON.stringify(frequencyMap, null, 2),
            },
        ],
    };
}
