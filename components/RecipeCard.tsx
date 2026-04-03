import Link from 'next/link';
import type { SearchResult } from '@/types/recipe';

export default function RecipeCard({ recipe }: { recipe: SearchResult }) {
  // Data-level ceiling: headnote trimmed to 300 chars before render
  const headnote =
    recipe.headnote && recipe.headnote.length > 300
      ? recipe.headnote.slice(0, 300)
      : recipe.headnote;

  return (
    <Link
      href={`/recipes/${recipe.slug}`}
      className="block rounded-lg border border-neutral-200 p-4 hover:border-neutral-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:border-neutral-700 dark:hover:border-neutral-500"
    >
      <h2 className="text-base font-medium leading-snug text-neutral-900 dark:text-neutral-100">
        {recipe.title}
      </h2>
      {headnote && (
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          {headnote}
        </p>
      )}
      <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
        {recipe.ingredient_count} ingredient{recipe.ingredient_count !== 1 ? 's' : ''}
      </p>
    </Link>
  );
}
