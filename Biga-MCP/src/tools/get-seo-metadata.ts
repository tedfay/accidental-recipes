import { sql } from '../db.js';

interface RecipeStep {
  order: number;
  text: string;
}

interface LinkedIngredientLine {
  rawString: string;
  ingredientId?: string | null;
}

export async function getSeoMetadata(slug: string): Promise<{ content: { type: 'text'; text: string }[] }> {
  const rows = await sql`
    SELECT
      r.slug,
      r.meta->>'titleOverride' AS title,
      r.meta->>'description' AS description,
      r.meta->>'canonicalUrl' AS canonical_url,
      r.meta->>'ogImage' AS og_image,
      r.headnote,
      r.ingredients,
      r.steps,
      r.original_source,
      r.created_at,
      r.updated_at,
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

  const ingredients = [
    ...new Set(
      (recipe['ingredients'] as LinkedIngredientLine[]).map((ing) => ing.rawString),
    ),
  ];
  const steps = (recipe['steps'] as RecipeStep[])
    .sort((a, b) => a.order - b.order)
    .map((step) => ({
      '@type': 'HowToStep',
      text: step.text,
    }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe['title'] ?? slug,
    description: recipe['description'] ?? recipe['headnote'] ?? undefined,
    url: recipe['canonical_url'] ?? undefined,
    image: recipe['og_image'] ?? undefined,
    recipeIngredient: ingredients,
    recipeInstructions: steps,
    datePublished: (recipe['created_at'] as Date).toISOString().split('T')[0],
    dateModified: recipe['updated_at']
      ? (recipe['updated_at'] as Date).toISOString().split('T')[0]
      : undefined,
    isBasedOn: recipe['derived_from_slug']
      ? `https://accidentalrecipes.com/recipes/${recipe['derived_from_slug']}`
      : undefined,
    author: {
      '@type': 'Person',
      name: ((recipe['meta'] as Record<string, unknown>)?.['author'] as string | undefined) ?? 'Ted Fay',
      url: 'https://www.2findmarketing.com/about/ted-fay',
    },
  };

  // Strip undefined values for clean JSON-LD output
  const cleaned = JSON.parse(JSON.stringify(jsonLd)) as Record<string, unknown>;

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(cleaned, null, 2),
      },
    ],
  };
}
