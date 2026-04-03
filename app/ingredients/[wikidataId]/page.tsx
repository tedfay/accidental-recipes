import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getIngredient } from '@/lib/mcp-client';
import type { IngredientEntity } from '@/types/ingredient';

/**
 * Dynamic route: no generateStaticParams yet.
 *
 * Static generation requires the MCP server to be reachable at build time.
 * The local dev transport (stdio via API route) only works when the dev
 * server is running. Once production transport is resolved (2FI-100),
 * re-enable generateStaticParams using list_ingredients.
 */
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ wikidataId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { wikidataId } = await params;
  const ingredient = await getIngredient(wikidataId);
  if (!ingredient?.name) return {};

  const displayName = formatDisplayName(ingredient);
  return {
    title: displayName,
    description: `${displayName} — entity page with linked recipes and Wikidata context.`,
  };
}

export default async function IngredientPage({ params }: PageProps) {
  const { wikidataId } = await params;
  const ingredient = await getIngredient(wikidataId);

  if (!ingredient?.name) {
    notFound();
  }

  const hasAlternateNames = ingredient.alternate_names.length > 0;
  const showCategory =
    ingredient.category && ingredient.category !== 'other';

  return (
    <>
      {/* ── Breadcrumb ─────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link
              href="/"
              className="underline decoration-neutral-300 underline-offset-2 hover:text-neutral-700 hover:decoration-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:decoration-neutral-600 dark:hover:text-neutral-200 dark:hover:decoration-neutral-400"
            >
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href="/ingredients"
              className="underline decoration-neutral-300 underline-offset-2 hover:text-neutral-700 hover:decoration-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:decoration-neutral-600 dark:hover:text-neutral-200 dark:hover:decoration-neutral-400"
            >
              Ingredients
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{ingredient.name}</li>
        </ol>
      </nav>

      <article>
        {/* ── Header: name + identity ──────────────────────────── */}
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">
            {ingredient.name}
            {hasAlternateNames && (
              <span className="text-neutral-500 dark:text-neutral-400">
                {' '}
                / {ingredient.alternate_names.join(' / ')}
              </span>
            )}
          </h1>

          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-neutral-600 dark:text-neutral-400">
            <div className="flex gap-1.5">
              <dt className="font-medium">Wikidata</dt>
              <dd>
                <a
                  href={`https://www.wikidata.org/wiki/${ingredient.wikidata_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:decoration-neutral-600 dark:hover:decoration-neutral-400"
                >
                  {ingredient.wikidata_id}
                </a>
              </dd>
            </div>

            {showCategory && (
              <div className="flex gap-1.5">
                <dt className="font-medium">Category</dt>
                <dd>{ingredient.category}</dd>
              </div>
            )}

            {ingredient.wikipedia_url && (
              <div className="flex gap-1.5">
                <dt className="font-medium">Wikipedia</dt>
                <dd>
                  <a
                    href={ingredient.wikipedia_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:decoration-neutral-600 dark:hover:decoration-neutral-400"
                  >
                    {ingredient.name} on Wikipedia
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </header>

        {/* ── Linked recipes ───────────────────────────────────── */}
        <section className="mt-8" aria-labelledby="recipes-heading">
          <h2
            id="recipes-heading"
            className="text-lg font-semibold tracking-tight"
          >
            Recipes using {ingredient.name}
          </h2>

          {ingredient.recipes.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
              No published recipes use this ingredient yet.
            </p>
          ) : (
            <ul className="mt-3 space-y-1.5" role="list">
              {ingredient.recipes.map((recipe) => (
                <li key={recipe.slug}>
                  <Link
                    href={`/recipes/${recipe.slug}`}
                    className="text-neutral-900 underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:text-neutral-100 dark:decoration-neutral-600 dark:hover:decoration-neutral-400"
                  >
                    {recipe.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-4 text-xs text-neutral-400 dark:text-neutral-500">
            {ingredient.recipes.length}{' '}
            {ingredient.recipes.length === 1 ? 'recipe' : 'recipes'}
          </p>
        </section>

        {/* ── Entity data (progressive disclosure, collapsed by default) */}
        <section className="mt-8">
          <details>
            <summary
              className="flex cursor-default items-center justify-between rounded-md border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-700 list-none [&::-webkit-details-marker]:hidden hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
              aria-controls="entity-details-panel"
            >
              <span>Entity data</span>
              <span aria-hidden="true" className="text-lg leading-none">+</span>
            </summary>
            <div
              id="entity-details-panel"
              role="region"
              aria-label="Wikidata entity details"
              className="mt-3 rounded-md border border-neutral-200 bg-neutral-50 px-4 py-4 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                <dt className="font-medium text-neutral-600 dark:text-neutral-400">
                  Canonical name
                </dt>
                <dd>{ingredient.name}</dd>

                {hasAlternateNames && (
                  <>
                    <dt className="font-medium text-neutral-600 dark:text-neutral-400">
                      Alternate names
                    </dt>
                    <dd>{ingredient.alternate_names.join(', ')}</dd>
                  </>
                )}

                <dt className="font-medium text-neutral-600 dark:text-neutral-400">
                  Wikidata ID
                </dt>
                <dd>
                  <a
                    href={`https://www.wikidata.org/wiki/${ingredient.wikidata_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:decoration-neutral-600 dark:hover:decoration-neutral-400"
                  >
                    {ingredient.wikidata_id}
                  </a>
                </dd>

                <dt className="font-medium text-neutral-600 dark:text-neutral-400">
                  Category
                </dt>
                <dd>{ingredient.category}</dd>
              </dl>
            </div>
          </details>
        </section>
      </article>
    </>
  );
}

/**
 * Format display name with regional variants.
 * Shows "name / alternate1 / alternate2" when alternates exist.
 */
function formatDisplayName(ingredient: IngredientEntity): string {
  if (ingredient.alternate_names.length === 0) {
    return ingredient.name;
  }
  return `${ingredient.name} / ${ingredient.alternate_names.join(' / ')}`;
}
