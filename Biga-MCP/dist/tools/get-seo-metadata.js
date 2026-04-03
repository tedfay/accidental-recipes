import { sql } from '../db.js';
export async function getSeoMetadata(slug) {
    const rows = await sql `
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
        ...new Set(recipe['ingredients'].map((ing) => ing.rawString)),
    ];
    const steps = recipe['steps']
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
        datePublished: recipe['created_at'].toISOString().split('T')[0],
        author: {
            '@type': 'Person',
            name: recipe['meta']?.['author'] ?? 'Ted Fay',
            url: 'https://www.2findmarketing.com/about/ted-fay',
        },
    };
    // Strip undefined values for clean JSON-LD output
    const cleaned = JSON.parse(JSON.stringify(jsonLd));
    return {
        content: [
            {
                type: 'text',
                text: JSON.stringify(cleaned, null, 2),
            },
        ],
    };
}
