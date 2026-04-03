import { sql } from '../db.js';

/**
 * Combined content search tool — accepts text query, ingredient include IDs,
 * and ingredient exclude IDs. All parameters are optional; any combination
 * is valid. When none are provided, returns all live recipes up to limit.
 *
 * include_ids and exclude_ids are Wikidata IDs (e.g. "Q23400"), resolved
 * to ingredient UUIDs before the recipe query.
 */
export async function searchContent(
  query: string | undefined,
  includeIds: string[] | undefined,
  excludeIds: string[] | undefined,
  limit: number,
): Promise<{ content: { type: 'text'; text: string }[] }> {
  const trimmedQuery = query?.trim() || null;
  const hasQuery = trimmedQuery !== null && trimmedQuery.length > 0;

  // Resolve Wikidata IDs to ingredient UUIDs
  let includeUuids: string[] | null = null;
  let excludeUuids: string[] | null = null;

  if (includeIds && includeIds.length > 0) {
    const rows = await sql`
      SELECT id FROM ingredients WHERE wikidata_id = ANY(${includeIds}::text[])
    `;
    includeUuids = rows.map((r) => r.id as string);
    // If none resolved, no recipes can match the include filter
    if (includeUuids.length === 0) {
      return { content: [{ type: 'text', text: '[]' }] };
    }
  }

  if (excludeIds && excludeIds.length > 0) {
    const rows = await sql`
      SELECT id FROM ingredients WHERE wikidata_id = ANY(${excludeIds}::text[])
    `;
    excludeUuids = rows.map((r) => r.id as string);
    // If none resolved, exclude filter is a no-op
    if (excludeUuids.length === 0) {
      excludeUuids = null;
    }
  }

  // Build the combined query with conditional clauses
  const results = await sql`
    SELECT
      r.slug,
      r.meta->>'titleOverride' AS title,
      r.headnote,
      jsonb_array_length(r.ingredients) AS ingredient_count,
      ${hasQuery
        ? sql`ts_rank(
            to_tsvector('english',
              coalesce(r.meta->>'titleOverride', '') || ' ' || coalesce(r.headnote, '')
            ),
            plainto_tsquery('english', ${trimmedQuery!})
          )`
        : sql`NULL::float`
      } AS rank
    FROM recipes r
    WHERE r.status = 'live'
      ${hasQuery
        ? sql`AND to_tsvector('english',
            coalesce(r.meta->>'titleOverride', '') || ' ' || coalesce(r.headnote, '')
          ) @@ plainto_tsquery('english', ${trimmedQuery!})`
        : sql``
      }
      ${includeUuids !== null
        ? sql`AND r.main_ingredients @> ${includeUuids}::uuid[]`
        : sql``
      }
      ${excludeUuids !== null
        ? sql`AND NOT r.main_ingredients && ${excludeUuids}::uuid[]`
        : sql``
      }
    ORDER BY
      ${hasQuery
        ? sql`rank DESC NULLS LAST,`
        : sql``
      }
      r.created_at DESC
    LIMIT ${limit}
  `;

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(results, null, 2),
      },
    ],
  };
}
