'use client';

import type { IngredientSummary } from '@/types/ingredient';

interface IngredientTagStripProps {
  ingredients: IngredientSummary[];
  selected: Set<string>;
  onToggle: (wikidataId: string) => void;
}

/**
 * Horizontal scrollable strip of ingredient tags.
 *
 * FLAG for visual review: horizontal scrollable strip is the default
 * treatment per the handoff doc. Evaluate whether a wrapping layout
 * would work better once real content is visible.
 */
export default function IngredientTagStrip({
  ingredients,
  selected,
  onToggle,
}: IngredientTagStripProps) {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin"
      role="group"
      aria-label="Filter by ingredient"
    >
      {ingredients.map((ing) => {
        const hasEntity = ing.wikidata_id !== null;
        const isSelected = hasEntity && selected.has(ing.wikidata_id);

        if (!hasEntity) {
          return (
            <span
              key={ing.id}
              className="shrink-0 rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-400 opacity-50 dark:border-neutral-700 dark:text-neutral-600"
              title="No entity link — filtering unavailable"
              aria-disabled="true"
            >
              {ing.name}
            </span>
          );
        }

        return (
          <button
            key={ing.id}
            type="button"
            role="button"
            aria-pressed={isSelected}
            onClick={() => onToggle(ing.wikidata_id)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${
              isSelected
                ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900'
                : 'border-neutral-300 text-neutral-700 hover:border-neutral-500 hover:text-neutral-900 dark:border-neutral-600 dark:text-neutral-300 dark:hover:border-neutral-400 dark:hover:text-neutral-100'
            }`}
          >
            {ing.name}
          </button>
        );
      })}
    </div>
  );
}
