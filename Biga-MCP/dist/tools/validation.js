/**
 * Input validation for MCP write tools (2FI-203).
 * Enforced at the MCP tool boundary with human-readable error messages.
 */
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG = 200;
const MAX_TITLE = 500;
const MAX_HEADNOTE = 5000;
const MAX_RAW_STRING = 1000;
const MAX_STEP_TEXT = 5000;
function validateSlug(slug) {
    const errors = [];
    if (!slug) {
        errors.push({ field: 'slug', message: 'Slug is required' });
    }
    else {
        if (slug.length > MAX_SLUG) {
            errors.push({ field: 'slug', message: `Slug must be ${MAX_SLUG} characters or fewer` });
        }
        if (!SLUG_REGEX.test(slug)) {
            errors.push({
                field: 'slug',
                message: 'Slug must be lowercase alphanumeric with hyphens (e.g. "my-recipe-name")',
            });
        }
    }
    return errors;
}
function validateTitle(title) {
    if (!title)
        return [{ field: 'title', message: 'Title is required' }];
    if (title.length > MAX_TITLE) {
        return [{ field: 'title', message: `Title must be ${MAX_TITLE} characters or fewer` }];
    }
    return [];
}
function validateHeadnote(headnote) {
    if (!headnote)
        return [];
    if (headnote.length > MAX_HEADNOTE) {
        return [{ field: 'headnote', message: `Headnote must be ${MAX_HEADNOTE} characters or fewer` }];
    }
    return [];
}
function validateIngredients(ingredients) {
    const errors = [];
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
        errors.push({ field: 'ingredients', message: 'At least one ingredient is required' });
        return errors;
    }
    for (let i = 0; i < ingredients.length; i++) {
        const ing = ingredients[i];
        if (!ing.rawString || ing.rawString.trim().length === 0) {
            errors.push({ field: `ingredients[${i}].rawString`, message: 'rawString is required' });
        }
        else if (ing.rawString.length > MAX_RAW_STRING) {
            errors.push({
                field: `ingredients[${i}].rawString`,
                message: `rawString must be ${MAX_RAW_STRING} characters or fewer`,
            });
        }
    }
    return errors;
}
function validateSteps(steps) {
    const errors = [];
    if (!Array.isArray(steps) || steps.length === 0) {
        errors.push({ field: 'steps', message: 'At least one step is required' });
        return errors;
    }
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (!step.text || step.text.trim().length === 0) {
            errors.push({ field: `steps[${i}].text`, message: 'Step text is required' });
        }
        else if (step.text.length > MAX_STEP_TEXT) {
            errors.push({
                field: `steps[${i}].text`,
                message: `Step text must be ${MAX_STEP_TEXT} characters or fewer`,
            });
        }
        if (!Number.isInteger(step.order) || step.order < 1) {
            errors.push({ field: `steps[${i}].order`, message: 'Step order must be a positive integer' });
        }
    }
    return errors;
}
export function validateCreateRecipe(input) {
    return [
        ...validateSlug(input.slug),
        ...validateTitle(input.title),
        ...validateHeadnote(input.headnote),
        ...validateIngredients(input.ingredients),
        ...validateSteps(input.steps),
    ];
}
export function validateUpdateRecipe(input) {
    const errors = [];
    if (!input.slug) {
        errors.push({ field: 'slug', message: 'Slug is required to identify the recipe' });
    }
    if (input.title !== undefined)
        errors.push(...validateTitle(input.title));
    if (input.headnote !== undefined)
        errors.push(...validateHeadnote(input.headnote));
    if (input.ingredients !== undefined)
        errors.push(...validateIngredients(input.ingredients));
    if (input.steps !== undefined)
        errors.push(...validateSteps(input.steps));
    return errors;
}
// ─── Image validation (2FI-215) ─────────────────────────────────────────────
const VALID_SOURCE_TYPES = ['ai_generated', 'stock', 'original', 'imported'];
const VALID_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_ALT_TEXT = 125;
export function validateUpdateRecipeImage(input) {
    const errors = [];
    if (!input.slug) {
        errors.push({ field: 'slug', message: 'Slug is required' });
    }
    else {
        errors.push(...validateSlug(input.slug));
    }
    if (!input.role) {
        errors.push({ field: 'role', message: 'Role is required (e.g. "hero")' });
    }
    if (!input.url) {
        errors.push({ field: 'url', message: 'Image source URL is required' });
    }
    if (!input.width || input.width < 1) {
        errors.push({ field: 'width', message: 'Width must be a positive number' });
    }
    if (!input.height || input.height < 1) {
        errors.push({ field: 'height', message: 'Height must be a positive number' });
    }
    if (!VALID_MIME_TYPES.includes(input.mime_type)) {
        errors.push({ field: 'mime_type', message: `Must be one of: ${VALID_MIME_TYPES.join(', ')}` });
    }
    if (!input.source?.type || !VALID_SOURCE_TYPES.includes(input.source.type)) {
        errors.push({ field: 'source.type', message: `Must be one of: ${VALID_SOURCE_TYPES.join(', ')}` });
    }
    if (!input.attribution?.text) {
        errors.push({ field: 'attribution.text', message: 'Attribution text is required' });
    }
    if (input.alt && input.alt.length > MAX_ALT_TEXT) {
        errors.push({ field: 'alt', message: `Alt text must be ${MAX_ALT_TEXT} characters or fewer` });
    }
    return errors;
}
