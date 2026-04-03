'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { SearchResult } from '@/types/recipe';
import type { IngredientSummary } from '@/types/ingredient';
import SearchInput from './SearchInput';
import IngredientFilterPanel from './IngredientFilterPanel';
import RecipeGrid from './RecipeGrid';

const SESSION_KEY = 'biga_session_filter';
const DEBOUNCE_MS = 300;

interface SessionFilter {
  selectedIngredients: string[];
}

function loadSession(): SessionFilter | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionFilter;
  } catch {
    return null;
  }
}

function saveSession(selected: Set<string>) {
  if (typeof window === 'undefined') return;
  const data: SessionFilter = { selectedIngredients: [...selected] };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

function clearSession() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SESSION_KEY);
}

interface HomePageClientProps {
  initialRecipes: SearchResult[];
  ingredients: IngredientSummary[];
  frequencyMap: Record<string, number>;
}

export default function HomePageClient({
  initialRecipes,
  ingredients,
  frequencyMap,
}: HomePageClientProps) {
  const [recipes, setRecipes] = useState<SearchResult[]>(initialRecipes);
  const [searchText, setSearchText] = useState('');
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredRef = useRef(false);

  // Unified fetch — calls search_content with both query and ingredient filters
  const fetchResults = useCallback(async (query: string, ids: Set<string>) => {
    setLoading(true);
    setError(null);
    try {
      const args: Record<string, unknown> = { limit: 56 };
      const trimmed = query.trim();
      if (trimmed.length > 0) args.query = trimmed;
      if (ids.size > 0) args.include_ids = [...ids];

      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'search_content', args }),
      });
      if (res.ok) {
        const raw = await res.json();
        const normalized = Array.isArray(raw) ? raw : (raw?.recipes ?? []);
        setRecipes(normalized as SearchResult[]);
      }
    } catch {
      setRecipes([]);
      setError('Failed to load recipes. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Restore session state on mount
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const session = loadSession();
    if (session && session.selectedIngredients.length > 0) {
      const ids = new Set(session.selectedIngredients);
      setSelectedIngredients(ids);
      fetchResults('', ids);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchText(value);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        fetchResults(value, selectedIngredients);
      }, DEBOUNCE_MS);
    },
    [selectedIngredients, fetchResults],
  );

  const handleIngredientToggle = useCallback(
    (wikidataId: string) => {
      setSelectedIngredients((prev) => {
        const next = new Set(prev);
        if (next.has(wikidataId)) {
          next.delete(wikidataId);
        } else {
          next.add(wikidataId);
        }

        if (next.size === 0) {
          clearSession();
        } else {
          saveSession(next);
        }

        fetchResults(searchText, next);
        return next;
      });
    },
    [searchText, fetchResults],
  );

  const handleClearFilters = useCallback(() => {
    setSearchText('');
    setSelectedIngredients(new Set());
    clearSession();
    fetchResults('', new Set());
  }, [fetchResults]);

  const hasActiveFilters = searchText.trim().length > 0 || selectedIngredients.size > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <SearchInput value={searchText} onChange={handleSearchChange} />
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="shrink-0 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-600 hover:border-neutral-500 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:border-neutral-600 dark:text-neutral-400 dark:hover:border-neutral-400 dark:hover:text-neutral-100"
          >
            Clear filters
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-6">
        {/* Filter panel: mobile bottom sheet + desktop sidebar handled internally */}
        <IngredientFilterPanel
          ingredients={ingredients}
          frequencyMap={frequencyMap}
          selectedIngredients={selectedIngredients}
          onToggle={handleIngredientToggle}
        />

        {/* Recipe grid */}
        <div
          className={`min-w-0 flex-1 transition-opacity duration-150 ${loading ? 'opacity-60' : ''}`}
        >
          <RecipeGrid recipes={recipes} resultCount={recipes.length} />
        </div>
      </div>
    </div>
  );
}
