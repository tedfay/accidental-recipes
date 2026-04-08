import { sql } from '../db.js';
import { getRecipe } from './get-recipe.js';
import { validateCreateRecipe } from './validation.js';
export async function createRecipe(input) {
    // Validate input
    const errors = validateCreateRecipe(input);
    if (errors.length > 0) {
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({ error: 'Validation failed', details: errors }),
                }],
        };
    }
    // Check slug uniqueness
    const [existing] = await sql `SELECT id FROM recipes WHERE slug = ${input.slug} LIMIT 1`;
    if (existing) {
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({ error: `A recipe with slug "${input.slug}" already exists` }),
                }],
        };
    }
    // Validate derived_from_recipe_id if provided
    if (input.derived_from_recipe_id) {
        const [parent] = await sql `SELECT id FROM recipes WHERE id = ${input.derived_from_recipe_id}::uuid LIMIT 1`;
        if (!parent) {
            return {
                content: [{
                        type: 'text',
                        text: JSON.stringify({ error: `Parent recipe not found: ${input.derived_from_recipe_id}` }),
                    }],
            };
        }
    }
    // Build ingredient lines with null entity fields
    const ingredientLines = input.ingredients.map((ing) => ({
        rawString: ing.rawString,
        quantity: ing.quantity ?? null,
        unit: ing.unit ?? null,
        preparation: ing.preparation ?? null,
        optional: ing.optional ?? false,
        ingredientId: null,
        entity: null,
    }));
    const status = input.status ?? 'draft';
    const meta = { version: 1 };
    const derivedId = input.derived_from_recipe_id ?? null;
    if (derivedId) {
        await sql `
      INSERT INTO recipes (slug, status, headnote, ingredients, steps, derived_from_recipe_id, meta)
      VALUES (
        ${input.slug}, ${status}, ${input.headnote ?? null},
        ${JSON.stringify(ingredientLines)}::jsonb, ${JSON.stringify(input.steps)}::jsonb,
        ${derivedId}::uuid, ${JSON.stringify({ ...meta, titleOverride: input.title })}::jsonb
      )
    `;
    }
    else {
        await sql `
      INSERT INTO recipes (slug, status, headnote, ingredients, steps, meta)
      VALUES (
        ${input.slug}, ${status}, ${input.headnote ?? null},
        ${JSON.stringify(ingredientLines)}::jsonb, ${JSON.stringify(input.steps)}::jsonb,
        ${JSON.stringify({ ...meta, titleOverride: input.title })}::jsonb
      )
    `;
    }
    // Return the full recipe via get_recipe
    return getRecipe(input.slug);
}
