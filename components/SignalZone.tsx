'use client';

import { useId, useState } from 'react';
import type { ContentEnrichment } from '@/types/enrichment';

/**
 * Enrichment signal zone — collapsed by default, user-toggled open.
 *
 * Platform-generic: takes a resolved/total count and an entity label noun,
 * so it works for any content object (recipes, products, articles, places).
 * The recipe page passes resolved/total computed from ingredients and
 * entityLabel="ingredients".
 *
 * Unenriched content is a valid platform state, not an error — when
 * enrichment is null, the button still renders ("0 of N resolved") and
 * the panel shows a single "Not yet enriched." line.
 *
 * Uses aria-expanded / aria-controls for accessibility.
 */
export default function SignalZone({
  resolved,
  total,
  entityLabel,
  enrichment,
}: {
  resolved: number;
  total: number;
  entityLabel: string;
  enrichment: ContentEnrichment | null;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <section className="mt-10 border-t border-border pt-6">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between rounded-md border border-border bg-canvas-raised px-4 py-3 text-left text-sm font-medium text-ink-secondary hover:bg-canvas-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        <span>
          Enrichment details
          <span className="ml-2 text-ink-muted">
            {resolved} of {total} {entityLabel} resolved
          </span>
        </span>
        <span aria-hidden="true" className="text-lg leading-none">
          {open ? '−' : '+'}
        </span>
      </button>

      {open && (
        <div
          id={panelId}
          role="region"
          aria-label="Enrichment signals"
          className="mt-3 rounded-md border border-border bg-canvas-raised px-4 py-4 text-sm"
        >
          {enrichment === null ? (
            <p className="text-ink-secondary">Not yet enriched.</p>
          ) : (
            <>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                <dt className="font-medium text-ink-secondary">
                  Resolved
                </dt>
                <dd>
                  {resolved} of {total} {entityLabel}
                </dd>

                <dt className="font-medium text-ink-secondary">
                  Last enriched
                </dt>
                <dd>{formatDate(enrichment.lastEnrichedAt)}</dd>

                <dt className="font-medium text-ink-secondary">
                  Enrichment version
                </dt>
                <dd>{enrichment.enrichmentVersion}</dd>
              </dl>

              {enrichment.signals && enrichment.signals.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    Signals
                  </h3>
                  <ul role="list" className="mt-2 space-y-2">
                    {enrichment.signals.map((signal, i) => (
                      <li
                        key={`signal-${i}`}
                        className="rounded border border-border px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`inline-block h-2 w-2 rounded-full ${signal.resolved ? 'bg-green-500' : 'bg-amber-500'}`} />
                          <span className="font-medium">{signal.type}</span>
                          {signal.resolved && (
                            <span className="text-xs text-ink-muted">resolved</span>
                          )}
                        </div>
                        <p className="mt-1 text-ink-secondary">
                          {signal.notes}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-muted">
                          {formatDate(signal.triggeredAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
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
