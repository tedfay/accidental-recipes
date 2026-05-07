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

/** Search result from search_content MCP tool */
export interface SearchResult {
  slug: string;
  title: string;
  headnote: string | null;
  ingredient_count: number;
  rank?: number;
  created_at?: string | null;
  updated_at?: string | null;
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
  /** Image entries keyed by role; null when no images uploaded yet (2FI-215) */
  images: ImagesJsonb | null;
  meta: RecipeMeta;
  enrichment: RecipeEnrichment;
  created_at: string;
}

// ─── Images (2FI-215) ──────────────────────────────────────────────────────
// Mirrors Biga-MCP/src/types/images.ts. Keep these in sync.

export type ImageSourceType = 'ai_generated' | 'stock' | 'original' | 'imported';

export interface ImageSource {
  type: ImageSourceType;
  model?: string;
  provider?: string;
  prompt?: string;
  generated_at?: string;
  generated_by?: string;
  credit?: string;
  license?: string;
}

export interface ImageAttribution {
  text: string;
  display: boolean;
}

export interface ImageEmbeddedMetadata {
  credit: string;
  source: string;
  copyright: string;
}

export interface ImageEntry {
  /** Path within the storage bucket — public URL composed at read time. */
  storage_path: string;
  filename: string;
  alt: string;
  width: number;
  height: number;
  mime_type: string;
  sha256: string;
  source: ImageSource;
  attribution: ImageAttribution;
  embedded_metadata?: ImageEmbeddedMetadata;
  embedded_metadata_skipped?: boolean;
  uploaded_at: string;
}

/** Keyed by role — "hero" today; "thumb" / "og" reserved for future use. */
export type ImagesJsonb = Record<string, ImageEntry>;
