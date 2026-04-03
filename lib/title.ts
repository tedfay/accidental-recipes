import type { RecipeMeta } from '@/types/recipe';

/**
 * Resolve display title using the CLAUDE.md priority chain:
 *   1. meta.titleOverride (if non-null)
 *   2. title (top-level field on recipe)
 *   3. slug humanized — last resort only
 */
export function resolveTitle(
  recipe: { meta?: RecipeMeta; title?: string },
  slug: string,
): string {
  if (recipe.meta?.titleOverride) return recipe.meta.titleOverride;
  if (recipe.title) return recipe.title;
  return humanizeSlug(slug);
}

/** Hyphens to spaces, title-cased. */
export function humanizeSlug(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
