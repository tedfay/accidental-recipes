import { sql } from '../db.js';
export async function getRecipe(slug) {
    const rows = await sql `
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
    const ingredientLines = recipe['ingredients'];
    const entityIds = ingredientLines
        .map((ing) => ing.ingredientId)
        .filter((id) => typeof id === 'string');
    let entityMap = {};
    if (entityIds.length > 0) {
        const entities = await sql `
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
