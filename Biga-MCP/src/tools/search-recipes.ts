import { sql } from '../db.js';

export async function searchRecipes(
  query: string,
  limit: number,
): Promise<{ content: { type: 'text'; text: string }[] }> {
  const trimmed = query.trim();

  // Empty query returns all live recipes, newest first (no FTS filtering)
  const results = trimmed.length === 0
    ? await sql`
        SELECT
          slug,
          meta->>'titleOverride' AS title,
          headnote,
          jsonb_array_length(ingredients) AS ingredient_count,
          NULL::float AS rank
        FROM recipes
        WHERE status = 'live'
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
    : await sql`
        SELECT
          slug,
          meta->>'titleOverride' AS title,
          headnote,
          jsonb_array_length(ingredients) AS ingredient_count,
          ts_rank(
            to_tsvector('english',
              coalesce(meta->>'titleOverride', '') || ' ' || coalesce(headnote, '')
            ),
            plainto_tsquery('english', ${trimmed})
          ) AS rank
        FROM recipes
        WHERE
          status = 'live'
          AND to_tsvector('english',
            coalesce(meta->>'titleOverride', '') || ' ' || coalesce(headnote, '')
          ) @@ plainto_tsquery('english', ${trimmed})
        ORDER BY rank DESC
        LIMIT ${limit}
      `;

  if (results.length === 0) {
    return { content: [{ type: 'text', text: `No recipes found for query: "${query}"` }] };
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(results, null, 2),
      },
    ],
  };
}
