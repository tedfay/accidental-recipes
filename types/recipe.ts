/** Ingredient line within a recipe */
export interface IngredientLine {
  rawString: string;
  /** Not populated by current MCP data — display name comes from entity.name or rawString */
  name?: string;
  quantity?: string | null;
  unit?: string | null;
  preparation?: string | null;
  optional?: boolean;
  ingredientId?: string | null;
  wikidataId?: string | null;
  resolvedLabel?: string | null;
  entity: {
    id: string;
    name: string;
    wikidata_id: string;
    category: string;
  } | null;
}

/** Step within a recipe */
export interface RecipeStep {
  order: number;
  text: string;
}

/** Recipe meta fields — matches actual MCP response shape */
export interface RecipeMeta {
  titleOverride?: string | null;
  noindex?: boolean;
  version?: number;
  sameAs?: string[];
  schemaTypes?: string[];
  analyticsMetadata?: Record<string, unknown>;
  /** Present in type for future use — not in current MCP data */
  description?: string | null;
  /** Present in type for future use — not in current MCP data */
  canonicalUrl?: string | null;
  /** Present in type for future use — not in current MCP data */
  ogImage?: string | null;
  /** Present in type for future use — not in current MCP data */
  author?: string | null;
}

/** Individual enrichment signal */
export interface EnrichmentSignal {
  type: string;
  notes: string;
  resolved: boolean;
  triggeredAt: string;
}

/** Enrichment data on a recipe */
export interface RecipeEnrichment {
  signals: EnrichmentSignal[];
  lastEnrichedAt: string;
  enrichmentVersion: number;
}

/** Search result from search_recipes MCP tool */
export interface SearchResult {
  slug: string;
  title: string;
  headnote: string | null;
  ingredient_count: number;
  rank?: number;
}

/** Full recipe as returned by get_recipe MCP tool */
export interface Recipe {
  id: string;
  slug: string;
  title: string;
  status: string;
  original_source: string;
  headnote: string | null;
  ingredients: IngredientLine[];
  steps: RecipeStep[];
  meta: RecipeMeta;
  enrichment: RecipeEnrichment;
  created_at: string;
}
