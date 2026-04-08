import { sql } from '../db.js';
import { getRecipe } from './get-recipe.js';
import { validateUpdateRecipe } from './validation.js';
export async function updateRecipe(rawInput) {
    // Defensive: MCP stdio transport may deliver arrays as JSON strings
    const input = {
        ...rawInput,
        ingredients: rawInput.ingredients !== undefined
            ? (typeof rawInput.ingredients === 'string' ? JSON.parse(rawInput.ingredients) : rawInput.ingredients)
            : undefined,
        steps: rawInput.steps !== undefined
            ? (typeof rawInput.steps === 'string' ? JSON.parse(rawInput.steps) : rawInput.steps)
            : undefined,
    };
    // Validate input
    const errors = validateUpdateRecipe(input);
    if (errors.length > 0) {
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({ error: 'Validation failed', details: errors }),
                }],
        };
    }
    // Check recipe exists
    const [existing] = await sql `SELECT id, meta FROM recipes WHERE slug = ${input.slug} LIMIT 1`;
    if (!existing) {
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({ error: `No recipe found with slug: ${input.slug}` }),
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
    // Build partial update — only SET columns that were provided.
    // Each field is updated individually. Postgres triggers handle
    // updated_at and version increment automatically.
    if (input.title !== undefined) {
        const currentMeta = existing['meta'] ?? {};
        const updatedMeta = { ...currentMeta, titleOverride: input.title };
        await sql `UPDATE recipes SET meta = ${sql.json(updatedMeta)} WHERE slug = ${input.slug}`;
    }
    if (input.headnote !== undefined) {
        await sql `UPDATE recipes SET headnote = ${input.headnote} WHERE slug = ${input.slug}`;
    }
    if (input.ingredients !== undefined) {
        const ingredientLines = input.ingredients.map((ing) => ({
            rawString: ing.rawString,
            quantity: ing.quantity ?? null,
            unit: ing.unit ?? null,
            preparation: ing.preparation ?? null,
            optional: ing.optional ?? false,
            ingredientId: null,
            entity: null,
        }));
        await sql `UPDATE recipes SET ingredients = ${sql.json(ingredientLines)} WHERE slug = ${input.slug}`;
    }
    if (input.steps !== undefined) {
        await sql `UPDATE recipes SET steps = ${sql.json(input.steps)} WHERE slug = ${input.slug}`;
    }
    if (input.derived_from_recipe_id !== undefined) {
        if (input.derived_from_recipe_id) {
            await sql `UPDATE recipes SET derived_from_recipe_id = ${input.derived_from_recipe_id}::uuid WHERE slug = ${input.slug}`;
        }
        else {
            await sql `UPDATE recipes SET derived_from_recipe_id = NULL WHERE slug = ${input.slug}`;
        }
    }
    return getRecipe(input.slug);
}
