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

export interface ValidationError {
  field: string;
  message: string;
}

export interface IngredientInput {
  quantity?: string | null;
  unit?: string | null;
  rawString: string;
  preparation?: string | null;
  optional?: boolean;
}

export interface StepInput {
  order: number;
  text: string;
}

function validateSlug(slug: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!slug) {
    errors.push({ field: 'slug', message: 'Slug is required' });
  } else {
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

function validateTitle(title: string): ValidationError[] {
  if (!title) return [{ field: 'title', message: 'Title is required' }];
  if (title.length > MAX_TITLE) {
    return [{ field: 'title', message: `Title must be ${MAX_TITLE} characters or fewer` }];
  }
  return [];
}

function validateHeadnote(headnote: string | undefined | null): ValidationError[] {
  if (!headnote) return [];
  if (headnote.length > MAX_HEADNOTE) {
    return [{ field: 'headnote', message: `Headnote must be ${MAX_HEADNOTE} characters or fewer` }];
  }
  return [];
}

function validateIngredients(ingredients: IngredientInput[]): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    errors.push({ field: 'ingredients', message: 'At least one ingredient is required' });
    return errors;
  }
  for (let i = 0; i < ingredients.length; i++) {
    const ing = ingredients[i]!;
    if (!ing.rawString || ing.rawString.trim().length === 0) {
      errors.push({ field: `ingredients[${i}].rawString`, message: 'rawString is required' });
    } else if (ing.rawString.length > MAX_RAW_STRING) {
      errors.push({
        field: `ingredients[${i}].rawString`,
        message: `rawString must be ${MAX_RAW_STRING} characters or fewer`,
      });
    }
  }
  return errors;
}

function validateSteps(steps: StepInput[]): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!Array.isArray(steps) || steps.length === 0) {
    errors.push({ field: 'steps', message: 'At least one step is required' });
    return errors;
  }
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    if (!step.text || step.text.trim().length === 0) {
      errors.push({ field: `steps[${i}].text`, message: 'Step text is required' });
    } else if (step.text.length > MAX_STEP_TEXT) {
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

export interface CreateRecipeInput {
  slug: string;
  title: string;
  headnote?: string | null;
  ingredients: IngredientInput[];
  steps: StepInput[];
  derived_from_recipe_id?: string | null;
  status?: 'draft' | 'live';
}

export interface UpdateRecipeInput {
  slug: string;
  title?: string;
  headnote?: string | null;
  ingredients?: IngredientInput[];
  steps?: StepInput[];
  derived_from_recipe_id?: string | null;
}

export function validateCreateRecipe(input: CreateRecipeInput): ValidationError[] {
  return [
    ...validateSlug(input.slug),
    ...validateTitle(input.title),
    ...validateHeadnote(input.headnote),
    ...validateIngredients(input.ingredients),
    ...validateSteps(input.steps),
  ];
}

export function validateUpdateRecipe(input: UpdateRecipeInput): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!input.slug) {
    errors.push({ field: 'slug', message: 'Slug is required to identify the recipe' });
  }
  if (input.title !== undefined) errors.push(...validateTitle(input.title));
  if (input.headnote !== undefined) errors.push(...validateHeadnote(input.headnote));
  if (input.ingredients !== undefined) errors.push(...validateIngredients(input.ingredients));
  if (input.steps !== undefined) errors.push(...validateSteps(input.steps));
  return errors;
}
