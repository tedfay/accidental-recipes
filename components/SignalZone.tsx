'use client';

import { useId, useState } from 'react';
import type { IngredientLine, RecipeEnrichment } from '@/types/recipe';

/**
 * Enrichment signal zone — collapsed by default, user-toggled open.
 *
 * Shows entity resolution count, enrichment metadata, and individual
 * signals. The expansion affordance is prominent — per spec:
 * "A collapsed section that isn't obviously expandable is invisible."
 *
 * Uses aria-expanded / aria-controls for accessibility.
 */
export default function SignalZone({
  ingredients,
  enrichment,
}: {
  ingredients: IngredientLine[];
  enrichment: RecipeEnrichment;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const totalCount = ingredients.length;
  const resolvedCount = ingredients.filter((i) => i.entity !== null).length;

  return (
    <section className="mt-10 border-t border-neutral-200 pt-6 dark:border-neutral-800">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between rounded-md border border-neutral-300 bg-neutral-50 px-4 py-3 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        <span>
          Enrichment details
          <span className="ml-2 text-neutral-500 dark:text-neutral-400">
            {resolvedCount} of {totalCount} ingredients resolved
          </span>
        </span>
        <span aria-hidden="true" className="text-lg leading-none">
          {open ? '\u2212' : '+'}
        </span>
      </button>

      {open && (
        <div
          id={panelId}
          role="region"
          aria-label="Enrichment signals"
          className="mt-3 rounded-md border border-neutral-200 bg-neutral-50 px-4 py-4 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
            <dt className="font-medium text-neutral-600 dark:text-neutral-400">
              Resolved
            </dt>
            <dd>
              {resolvedCount} of {totalCount} ingredients
            </dd>

            <dt className="font-medium text-neutral-600 dark:text-neutral-400">
              Last enriched
            </dt>
            <dd>{formatDate(enrichment.lastEnrichedAt)}</dd>

            <dt className="font-medium text-neutral-600 dark:text-neutral-400">
              Enrichment version
            </dt>
            <dd>{enrichment.enrichmentVersion}</dd>
          </dl>

          {enrichment.signals.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Signals
              </h3>
              <ul role="list" className="mt-2 space-y-2">
                {enrichment.signals.map((signal, i) => (
                  <li
                    key={`signal-${i}`}
                    className="rounded border border-neutral-200 px-3 py-2 dark:border-neutral-700"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`inline-block h-2 w-2 rounded-full ${signal.resolved ? 'bg-green-500' : 'bg-amber-500'}`} />
                      <span className="font-medium">{signal.type}</span>
                      {signal.resolved && (
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">resolved</span>
                      )}
                    </div>
                    <p className="mt-1 text-neutral-600 dark:text-neutral-400">
                      {signal.notes}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
                      {formatDate(signal.triggeredAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}
