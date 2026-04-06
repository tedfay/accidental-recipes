'use client';

import { useId } from 'react';
import Link from 'next/link';
import type { IngredientLine } from '@/types/recipe';

/**
 * Single ingredient line with optional Wikidata entity progressive disclosure.
 *
 * When entity exists: shows quantity/unit/name/preparation with a small dot
 * indicator. Clicking or keyboard-activating the dot expands a panel with
 * entity details and a link to the ingredient entity page.
 *
 * When entity is null: plain text from rawString. No indicator, no interaction.
 *
 * Uses <details>/<summary> for graceful degradation without JS.
 * Accessibility: aria-expanded, aria-controls, role="region", aria-label.
 */
export default function IngredientLineItem({
  ingredient,
}: {
  ingredient: IngredientLine;
}) {
  const panelId = useId();

  if (!ingredient.entity) {
    return (
      <li className="relative py-1 text-ink">
        {/* Marker gutter — static bullet for unlinked ingredients.
            Holds the space where a category icon will go when data supports it. */}
        <span
          className="absolute -left-5 top-[0.55rem] inline-block h-[7px] w-[7px] rounded-full border border-ink-muted"
          aria-hidden="true"
        />
        {ingredient.rawString}
      </li>
    );
  }

  const { entity } = ingredient;
  const showCategory = entity.category && entity.category !== 'other';

  return (
    <li className="relative py-1">
      <details className="group">
        <summary
          className="cursor-default list-none text-ink [&::-webkit-details-marker]:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          aria-controls={panelId}
        >
          {/* Marker gutter — entity dot as disclosure cue.
              Sits in same position as the static bullet on unlinked lines. */}
          <span
            className="absolute -left-5 top-[0.55rem] inline-block h-[7px] w-[7px] rounded-full bg-ink-muted group-open:bg-ink-secondary"
            aria-hidden="true"
          />
          {formatIngredientText(ingredient)}
        </summary>
        <div
          id={panelId}
          role="region"
          aria-label={`Entity details for ${entity.name}`}
          className="mt-1.5 rounded border border-border bg-canvas-raised px-3 py-2 text-sm"
        >
          <dl className="flex flex-wrap gap-x-4 gap-y-1">
            <div className="flex gap-1.5">
              <dt className="font-medium text-ink-secondary">Entity</dt>
              <dd>{entity.name}</dd>
            </div>
            {showCategory && (
              <div className="flex gap-1.5">
                <dt className="font-medium text-ink-secondary">Category</dt>
                <dd>{entity.category}</dd>
              </div>
            )}
            <div className="flex gap-1.5">
              <dt className="font-medium text-ink-secondary">Wikidata</dt>
              <dd>{entity.wikidata_id}</dd>
            </div>
          </dl>
          {/* TODO: 2FI-130 — ingredient routes will move to /ingredients/[slug] */}
          <Link
            href={`/ingredients/${entity.wikidata_id}`}
            className="mt-1.5 inline-block text-sm link-secondary"
          >
            View ingredient
          </Link>
        </div>
      </details>
    </li>
  );
}

/**
 * Format ingredient display text from typed fields.
 * Unit strings come from the data layer — never hardcoded.
 */
function formatIngredientText(ingredient: IngredientLine): string {
  const parts: string[] = [];

  if (ingredient.quantity) {
    parts.push(ingredient.quantity);
  }
  if (ingredient.unit) {
    parts.push(ingredient.unit);
  }

  // Display name: entity.name when entity exists (caller already checked)
  const name = ingredient.entity?.name ?? ingredient.rawString;
  parts.push(name);

  if (ingredient.preparation) {
    parts.push(`(${ingredient.preparation})`);
  }

  if (ingredient.optional) {
    parts.push('— optional');
  }

  return parts.join(' ');
}
