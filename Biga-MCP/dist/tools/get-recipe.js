import { sql } from '../db.js';
export async function getRecipe(slug) {
    const rows = await sql `
    SELECT
      r.id, r.slug, r.meta->>'titleOverride' AS title, r.status, r.original_source,
      r.headnote, r.ingredients, r.steps, r.meta, r.enrichment,
      r.created_at, r.updated_at, r.derived_from_recipe_id,
      parent.slug AS derived_from_slug
    FROM recipes r
    LEFT JOIN recipes parent ON r.derived_from_recipe_id = parent.id
    WHERE r.slug = ${slug}
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
