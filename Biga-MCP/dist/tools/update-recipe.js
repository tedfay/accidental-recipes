import { sql } from '../db.js';
import { getRecipe } from './get-recipe.js';
import { validateUpdateRecipe } from './validation.js';
export async function updateRecipe(input) {
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
    // Build partial update — only SET columns that were provided
    // We build the SET clause dynamically based on what fields are present
    const updates = [];
    const values = [];
    if (input.title !== undefined) {
        // Title lives in meta.titleOverride
        const currentMeta = existing['meta'] ?? {};
        const updatedMeta = { ...currentMeta, titleOverride: input.title };
        updates.push('meta');
        values.push(JSON.stringify(updatedMeta));
    }
    if (input.headnote !== undefined) {
        updates.push('headnote');
        values.push(input.headnote);
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
        updates.push('ingredients');
        values.push(JSON.stringify(ingredientLines));
    }
    if (input.steps !== undefined) {
        updates.push('steps');
        values.push(JSON.stringify(input.steps));
    }
    if (input.derived_from_recipe_id !== undefined) {
        updates.push('derived_from_recipe_id');
        values.push(input.derived_from_recipe_id);
    }
    if (updates.length === 0) {
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({ error: 'No fields provided to update' }),
                }],
        };
    }
    // Execute update using dynamic SQL
    // postgres.js tagged templates don't support dynamic column names easily,
    // so we build individual SET clauses
    if (updates.includes('meta') && updates.includes('headnote') && updates.includes('ingredients') && updates.includes('steps')) {
        const metaVal = values[updates.indexOf('meta')];
        const headnoteVal = values[updates.indexOf('headnote')];
        const ingredientsVal = values[updates.indexOf('ingredients')];
        const stepsVal = values[updates.indexOf('steps')];
        await sql `
      UPDATE recipes SET
        meta = ${metaVal}::jsonb,
        headnote = ${headnoteVal},
        ingredients = ${ingredientsVal}::jsonb,
        steps = ${stepsVal}::jsonb
      WHERE slug = ${input.slug}
    `;
    }
    else {
        // Handle partial updates one field at a time
        // Version trigger and updated_at trigger fire on each UPDATE
        for (let i = 0; i < updates.length; i++) {
            const field = updates[i];
            const value = values[i];
            switch (field) {
                case 'meta':
                    await sql `UPDATE recipes SET meta = ${value}::jsonb WHERE slug = ${input.slug}`;
                    break;
                case 'headnote':
                    await sql `UPDATE recipes SET headnote = ${value} WHERE slug = ${input.slug}`;
                    break;
                case 'ingredients':
                    await sql `UPDATE recipes SET ingredients = ${value}::jsonb WHERE slug = ${input.slug}`;
                    break;
                case 'steps':
                    await sql `UPDATE recipes SET steps = ${value}::jsonb WHERE slug = ${input.slug}`;
                    break;
                case 'derived_from_recipe_id':
                    if (value) {
                        await sql `UPDATE recipes SET derived_from_recipe_id = ${value}::uuid WHERE slug = ${input.slug}`;
                    }
                    else {
                        await sql `UPDATE recipes SET derived_from_recipe_id = NULL WHERE slug = ${input.slug}`;
                    }
                    break;
            }
        }
    }
    return getRecipe(input.slug);
}
