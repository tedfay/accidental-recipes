import type { SearchResult } from '@/types/recipe';
import RecipeCard from './RecipeCard';

interface RecipeGridProps {
  recipes: SearchResult[];
  resultCount: number;
}

export default function RecipeGrid({ recipes, resultCount }: RecipeGridProps) {
  if (!Array.isArray(recipes)) {
    return (
      <section aria-label="Recipe results">
        <p className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
          No recipes match the current filter.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Recipe results">
      <div aria-live="polite" className="sr-only">
        {resultCount} recipe{resultCount !== 1 ? 's' : ''} found
      </div>
      {recipes.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
          No recipes match the current filter.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.slug} recipe={recipe} />
          ))}
        </div>
      )}
    </section>
  );
}
