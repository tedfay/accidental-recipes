import { sql } from '../db.js';
import { getRecipe } from './get-recipe.js';
import { notifyIndexNow } from '../hooks/notify-indexnow.js';

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

  // Idempotent: if already live, return current state without re-firing IndexNow.
  // Agentic callers retry on transient failures; non-idempotent publish forces
  // them to parse error strings as success-by-other-means.
  if (existing['status'] === 'live') {
    return getRecipe(slug);
  }

  await sql`UPDATE recipes SET status = 'live' WHERE slug = ${slug}`;
  notifyIndexNow([slug]);

  return getRecipe(slug);
}
