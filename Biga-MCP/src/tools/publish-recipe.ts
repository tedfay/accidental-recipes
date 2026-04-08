import { sql } from '../db.js';
import { getRecipe } from './get-recipe.js';

export async function publishRecipe(
  slug: string,
): Promise<{ content: { type: 'text'; text: string }[] }> {
  if (!slug) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: 'Slug is required' }),
      }],
    };
  }

  // Check recipe exists and current status
  const [existing] = await sql`SELECT id, status FROM recipes WHERE slug = ${slug} LIMIT 1`;
  if (!existing) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: `No recipe found with slug: ${slug}` }),
      }],
    };
  }

  if (existing['status'] === 'live') {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: `Recipe "${slug}" is already live` }),
      }],
    };
  }

  await sql`UPDATE recipes SET status = 'live' WHERE slug = ${slug}`;

  return getRecipe(slug);
}
