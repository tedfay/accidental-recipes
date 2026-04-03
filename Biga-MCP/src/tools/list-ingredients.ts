import { sql } from '../db.js';

interface IngredientSummary {
  id: string;
  name: string;
  wikidata_id: string;
  category: string;
  alternate_names: string[];
}

export async function listIngredients(): Promise<{
  content: { type: 'text'; text: string }[];
}> {
  const rows = await sql<IngredientSummary[]>`
    SELECT id, name, wikidata_id, category, alternate_names
    FROM ingredients
    ORDER BY name
  `;

  // Coerce alternate_names: Postgres text[] with DEFAULT '{}' may serialize
  // as {} (object) instead of [] (array) through the postgres npm library
  const normalized = rows.map((row) => ({
    ...row,
    alternate_names: Array.isArray(row.alternate_names) ? row.alternate_names : [],
  }));

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(normalized, null, 2),
      },
    ],
  };
}
