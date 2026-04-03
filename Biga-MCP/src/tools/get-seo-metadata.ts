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
      slug,
      meta->>'titleOverride' AS title,
      meta->>'description' AS description,
      meta->>'canonicalUrl' AS canonical_url,
      meta->>'ogImage' AS og_image,
      headnote,
      ingredients,
      steps,
      original_source,
      created_at
    FROM recipes
    WHERE slug = ${slug}
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
