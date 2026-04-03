/** Ingredient entity as returned by get_ingredient MCP tool */
export interface IngredientEntity {
  id: string;
  name: string;
  wikidata_id: string;
  category: string;
  alternate_names: string[];
  wikipedia_url: string | null;
  seasonality: unknown | null;
  nutrition: unknown | null;
  common_substitutes: unknown[];
  sources: unknown[];
  recipes: RecipeRef[];
}

/** Lightweight recipe reference (slug + title only) */
export interface RecipeRef {
  slug: string;
  title: string;
}

/** Ingredient summary as returned by list_ingredients MCP tool */
export interface IngredientSummary {
  id: string;
  name: string;
  wikidata_id: string;
  category: string;
  alternate_names: string[];
}
