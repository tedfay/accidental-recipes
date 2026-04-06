'use client';

import { useState, useMemo } from 'react';
import type { IngredientSummary } from '@/types/ingredient';

const CATEGORY_ORDER = [
  'protein',
  'legume',
  'vegetable',
  'fruit',
  'allium',
  'herb',
  'spice',
  'starch',
  'dairy',
  'fat',
  'flavor_base',
  'acid',
  'liquid',
  'sweetener',
  'condiment',
  'nut',
  'seed',
  'alcohol',
  'leavening',
  'thickener',
  'other',
] as const;

interface IngredientFilterPanelProps {
  ingredients: IngredientSummary[];
  frequencyMap: Record<string, number>;
  selectedIngredients: Set<string>;
  onToggle: (wikidataId: string) => void;
}

export default function IngredientFilterPanel({
  ingredients,
  frequencyMap,
  selectedIngredients,
  onToggle,
}: IngredientFilterPanelProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const activeCount = selectedIngredients.size;

  // Build a name lookup for selected ingredient summary
  const nameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const ing of ingredients) {
      if (ing.wikidata_id) m.set(ing.wikidata_id, ing.name);
    }
    return m;
  }, [ingredients]);

  const selectedNames = useMemo(
    () => [...selectedIngredients].map((id) => nameMap.get(id) ?? id),
    [selectedIngredients, nameMap],
  );

  // Filter, group, and sort — stable order, no reordering on selection
  const { orderedCategories, grouped } = useMemo(() => {
    const lowerFilter = filterText.toLowerCase();
    const g = new Map<string, IngredientSummary[]>();

    for (const ing of ingredients) {
      if (ing.wikidata_id === null) continue;
      const count = frequencyMap[ing.wikidata_id] ?? 0;

      // Dynamic display: hide zero-frequency items (unless currently selected)
      if (count === 0 && !selectedIngredients.has(ing.wikidata_id)) continue;

      // Text filter within panel
      if (lowerFilter && !ing.name.toLowerCase().includes(lowerFilter)) continue;

      const cat = ing.category || 'other';
      const list = g.get(cat);
      if (list) {
        list.push(ing);
      } else {
        g.set(cat, [ing]);
      }
    }

    // Sort by frequency only — no reordering based on selection state
    for (const list of g.values()) {
      list.sort(
        (a, b) => (frequencyMap[b.wikidata_id] ?? 0) - (frequencyMap[a.wikidata_id] ?? 0),
      );
    }

    const ordered = CATEGORY_ORDER.filter((cat) => g.has(cat));
    return { orderedCategories: ordered, grouped: g };
  }, [ingredients, frequencyMap, selectedIngredients, filterText]);

  const searchInput = (
    <input
      type="text"
      value={filterText}
      onChange={(e) => setFilterText(e.target.value)}
      placeholder="Search ingredients..."
      className="w-full rounded border border-border bg-transparent px-2 py-1.5 text-xs text-ink-secondary placeholder:text-ink-muted focus:border-ink-muted focus:outline-none"
    />
  );

  // Active filter breadcrumb summary
  const filterSummary = activeCount > 0 && (
    <div className="flex flex-wrap items-center gap-1 text-xs text-ink-muted">
      <span className="text-ink-muted">Filtering:</span>
      {selectedNames.map((name, i) => (
        <span key={name}>
          <span className="text-ink-secondary">{name}</span>
          {i < selectedNames.length - 1 && (
            <span className="text-border">{' + '}</span>
          )}
        </span>
      ))}
    </div>
  );

  const panelContent = (
    <div
      className="space-y-2"
      role="group"
      aria-label="Filter by ingredient"
    >
      {orderedCategories.map((category, idx) => {
        const items = grouped.get(category)!;
        return (
          <div key={category}>
            {idx > 0 && (
              <div className="mb-2 border-t border-border-subtle" />
            )}
            <div className="space-y-0.5">
              {items.map((ing) => {
                const isSelected = selectedIngredients.has(ing.wikidata_id);
                const count = frequencyMap[ing.wikidata_id] ?? 0;
                return (
                  <button
                    key={ing.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onToggle(ing.wikidata_id)}
                    className={`flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${
                      isSelected
                        ? 'font-medium text-ink'
                        : 'text-ink-muted hover:text-ink-secondary'
                    }`}
                  >
                    <span className="flex-1 truncate">{ing.name}</span>
                    <span className="tabular-nums text-[10px] text-ink-muted">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {orderedCategories.length === 0 && (
        <p className="py-2 text-xs text-ink-muted">
          No matching ingredients.
        </p>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile: filter button */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-ink-secondary hover:border-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          <span>Filter</span>
          {activeCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1.5 text-xs text-canvas">
              {activeCount}
            </span>
          )}
        </button>
        {/* Active filter summary below the button */}
        {filterSummary && <div className="mt-2">{filterSummary}</div>}
      </div>

      {/* Mobile: bottom sheet */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[75vh] flex-col rounded-t-2xl bg-canvas">
            {/* Sticky header */}
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-border-subtle bg-canvas px-4 py-3">
              <h2 className="text-sm font-medium text-ink">
                Filter by ingredient
                {activeCount > 0 && (
                  <span className="ml-2 text-xs font-normal text-ink-muted">
                    {activeCount} selected
                  </span>
                )}
              </h2>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded px-2 py-1 text-sm font-medium text-ink hover:bg-canvas-raised"
              >
                Done
              </button>
            </div>
            {/* Search + scrollable content */}
            <div className="overflow-y-auto px-4 pb-4 pt-3">
              <div className="mb-3">{searchInput}</div>
              {panelContent}
            </div>
          </div>
        </div>
      )}

      {/* Desktop: collapsible sidebar — collapsed by default */}
      <aside className="hidden shrink-0 md:block" aria-label="Ingredient filters">
        {!desktopOpen ? (
          <button
            type="button"
            onClick={() => setDesktopOpen(true)}
            aria-expanded="false"
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-ink-secondary hover:border-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="14" y2="12" />
              <line x1="4" y1="18" x2="10" y2="18" />
            </svg>
            <span>Filter ingredients</span>
            {activeCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1.5 text-xs text-canvas">
                {activeCount}
              </span>
            )}
          </button>
        ) : (
          <div className="w-52 border-r border-border-subtle pr-6">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                Ingredients
              </span>
              <button
                type="button"
                onClick={() => setDesktopOpen(false)}
                aria-expanded="true"
                className="rounded p-1 text-ink-muted hover:text-ink-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                aria-label="Collapse filter panel"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="mb-3">{searchInput}</div>
            {filterSummary && <div className="mb-3">{filterSummary}</div>}
            {panelContent}
          </div>
        )}
      </aside>
    </>
  );
}
