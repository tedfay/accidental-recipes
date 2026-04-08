import { sql } from '../db.js';
/** Default config for accidentalrecipes.com (food/ingredient entities) */
const DEFAULT_ENTITY_CONFIG = {
    table: 'ingredients',
    joinColumn: 'main_ingredients',
    nameColumn: 'name',
    aliasColumn: 'alternate_names',
};
// ---------------------------------------------------------------------------
// searchContent
// ---------------------------------------------------------------------------
/**
 * Combined content search tool — accepts text query, ingredient include IDs,
 * and ingredient exclude IDs. All parameters are optional; any combination
 * is valid. When none are provided, returns all live recipes up to limit.
 *
 * include_ids and exclude_ids are Wikidata IDs (e.g. "Q23400"), resolved
 * to ingredient UUIDs before the recipe query.
 */
export async function searchContent(query, includeIds, excludeIds, limit, entityConfig = DEFAULT_ENTITY_CONFIG) {
    const trimmedQuery = query?.trim() || null;
    const hasQuery = trimmedQuery !== null && trimmedQuery.length > 0;
    const { table, joinColumn, nameColumn, aliasColumn } = entityConfig;
    // Resolve Wikidata IDs to entity UUIDs
    let includeUuids = null;
    let excludeUuids = null;
    if (includeIds && includeIds.length > 0) {
        const rows = await sql `
      SELECT id FROM ${sql(table)} WHERE wikidata_id = ANY(${includeIds}::text[])
    `;
        includeUuids = rows.map((r) => r.id);
        if (includeUuids.length === 0) {
            return { content: [{ type: 'text', text: '[]' }] };
        }
    }
    if (excludeIds && excludeIds.length > 0) {
        const rows = await sql `
      SELECT id FROM ${sql(table)} WHERE wikidata_id = ANY(${excludeIds}::text[])
    `;
        excludeUuids = rows.map((r) => r.id);
        if (excludeUuids.length === 0) {
            excludeUuids = null;
        }
    }
    // Entity name + alias expansion subquery (config-driven identifiers).
    // sql() with a string argument produces a safe identifier; sql.unsafe()
    // is used only for the composed sub-select since postgres.js tagged
    // templates don't support dynamic FROM/column references in subqueries.
    const entityExpansion = sql.unsafe(`coalesce((
      SELECT string_agg(
        e.${nameColumn} || ' ' || array_to_string(e.${aliasColumn}, ' '),
        ' '
      )
      FROM ${table} e
      WHERE e.id = ANY(r.${joinColumn})
    ), '')`);
    // Build the combined query. When hasQuery is true, a CTE computes
    // the FTS vector once so it can be used in both ts_rank and the
    // WHERE clause without duplication.
    const results = hasQuery
        ? await sql `
        WITH fts AS (
          SELECT
            r.slug,
            r.meta->>'titleOverride' AS title,
            r.headnote,
            jsonb_array_length(r.ingredients) AS ingredient_count,
            r.created_at,
            ${sql(joinColumn)} AS entity_uuids,
            (
              setweight(to_tsvector('english', coalesce(r.meta->>'titleOverride', '')), 'A') ||
              setweight(to_tsvector('english', coalesce(r.headnote, '')), 'B') ||
              setweight(to_tsvector('english',
                coalesce((
                  SELECT string_agg(line->>'rawString', ' ')
                  FROM jsonb_array_elements(r.ingredients) AS line
                ), '') || ' ' || ${entityExpansion}
              ), 'C')
            ) AS vec
          FROM recipes r
          WHERE r.status = 'live'
        )
        SELECT
          slug, title, headnote, ingredient_count,
          ts_rank(vec, plainto_tsquery('english', ${trimmedQuery})) AS rank
        FROM fts
        WHERE vec @@ plainto_tsquery('english', ${trimmedQuery})
          ${includeUuids !== null
            ? sql `AND entity_uuids @> ${includeUuids}::uuid[]`
            : sql ``}
          ${excludeUuids !== null
            ? sql `AND NOT entity_uuids && ${excludeUuids}::uuid[]`
            : sql ``}
        ORDER BY rank DESC NULLS LAST, created_at DESC
        LIMIT ${limit}
      `
        : await sql `
        SELECT
          r.slug,
          r.meta->>'titleOverride' AS title,
          r.headnote,
          jsonb_array_length(r.ingredients) AS ingredient_count,
          NULL::float AS rank
        FROM recipes r
        WHERE r.status = 'live'
          ${includeUuids !== null
            ? sql `AND r.${sql(joinColumn)} @> ${includeUuids}::uuid[]`
            : sql ``}
          ${excludeUuids !== null
            ? sql `AND NOT r.${sql(joinColumn)} && ${excludeUuids}::uuid[]`
            : sql ``}
        ORDER BY r.created_at DESC
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
