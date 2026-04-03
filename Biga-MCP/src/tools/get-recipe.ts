import { sql } from '../db.js';

interface IngredientRow {
  id: string;
  name: string;
  wikidata_id: string;
  category: string;
}

interface LinkedIngredientLine {
  rawString: string;
  name?: string;
  quantity?: string | null;
  unit?: string | null;
  preparation?: string | null;
  optional?: boolean;
  ingredientId?: string | null;
  wikidataId?: string | null;
  resolvedLabel?: string | null;
}

export async function getRecipe(slug: string): Promise<{ content: { type: 'text'; text: string }[] }> {
  const rows = await sql`
    SELECT id, slug, meta->>'titleOverride' AS title, status, original_source, headnote, ingredients, steps, meta, enrichment, created_at
    FROM recipes
    WHERE slug = ${slug}
    LIMIT 1
  `;

  const recipe = rows[0];
  if (!recipe) {
    return { content: [{ type: 'text', text: `No recipe found with slug: ${slug}` }] };
  }

  // Gather ingredient entity IDs for a single batch lookup
  const ingredientLines = recipe['ingredients'] as LinkedIngredientLine[];
  const entityIds = ingredientLines
    .map((ing) => ing.ingredientId)
    .filter((id): id is string => typeof id === 'string');

  let entityMap: Record<string, IngredientRow> = {};
  if (entityIds.length > 0) {
    const entities = await sql<IngredientRow[]>`
      SELECT id, name, wikidata_id, category
      FROM ingredients
      WHERE id = ANY(${sql.array(entityIds)}::uuid[])
    `;
    entityMap = Object.fromEntries(entities.map((e) => [e.id, e]));
  }

  const enrichedIngredients = ingredientLines.map((ing) => ({
    ...ing,
    entity: ing.ingredientId ? (entityMap[ing.ingredientId] ?? null) : null,
  }));

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ ...recipe, ingredients: enrichedIngredients }, null, 2),
      },
    ],
  };
}
