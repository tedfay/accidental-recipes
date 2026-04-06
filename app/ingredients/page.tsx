import type { Metadata } from 'next';
import Link from 'next/link';
import { listIngredients } from '@/lib/mcp-client';
import type { IngredientSummary } from '@/types/ingredient';

/**
 * Ingredients index — /ingredients
 *
 * Browseable list of all ingredients in the knowledge graph.
 * Groups by category where category is not "other", then renders
 * remaining "other" ingredients as a flat alphabetical list.
 *
 * Data reality: all 154 ingredients currently have category "other".
 * The grouping logic is structurally correct and will surface named
 * categories when data quality improves.
 *
 * Static generation requires the MCP server at build time (2FI-100).
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Ingredients',
  description:
    'Browse all ingredients in the Accidental Recipes knowledge graph, linked to Wikidata entities.',
  alternates: { canonical: '/ingredients' },
};

export default async function IngredientsPage() {
  let ingredients: Awaited<ReturnType<typeof listIngredients>> = [];

  try {
    ingredients = await listIngredients();
  } catch {
    // MCP server unreachable at build time — render with empty data.
  }

  const sorted = [...ingredients].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const { categorized, other } = groupByCategory(sorted);
  const categoryNames = Object.keys(categorized).sort();

  return (
    <>
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 text-sm text-ink-muted"
      >
        <ol className="flex items-center gap-1.5">
          <li>
            <Link
              href="/"
              className="link-secondary"
            >
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">Ingredients</li>
        </ol>
      </nav>

      <h1 className="text-3xl font-semibold tracking-tight">Ingredients</h1>
      <p className="mt-2 text-sm text-ink-secondary">
        {ingredients.length} ingredients linked to Wikidata entities.
      </p>

      {/* Named category groups */}
      {categoryNames.map((category) => (
        <section
          key={category}
          className="mt-8"
          aria-labelledby={`category-${slugify(category)}`}
        >
          <h2
            id={`category-${slugify(category)}`}
            className="text-lg font-semibold tracking-tight capitalize"
          >
            {category}
          </h2>
          <IngredientGrid ingredients={categorized[category]} />
        </section>
      ))}

      {/* "Other" / uncategorized — flat alphabetical list */}
      {other.length > 0 && (
        <section
          className="mt-8"
          aria-labelledby={categoryNames.length > 0 ? 'category-other' : undefined}
        >
          {categoryNames.length > 0 && (
            <h2
              id="category-other"
              className="text-lg font-semibold tracking-tight"
            >
              Other
            </h2>
          )}
          <IngredientGrid ingredients={other} />
        </section>
      )}
    </>
  );
}

function IngredientGrid({
  ingredients,
}: {
  ingredients: IngredientSummary[];
}) {
  return (
    <ul
      role="list"
      className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3"
    >
      {ingredients.map((ingredient) => (
        <li key={ingredient.id} className="py-1">
          <IngredientEntry ingredient={ingredient} />
        </li>
      ))}
    </ul>
  );
}

function IngredientEntry({
  ingredient,
}: {
  ingredient: IngredientSummary;
}) {
  const hasAlternates = ingredient.alternate_names.length > 0;

  if (!ingredient.wikidata_id) {
    return (
      <span className="text-ink-secondary">
        {ingredient.name}
        {hasAlternates && (
          <span className="text-ink-muted">
            {' '}
            / {ingredient.alternate_names.join(' / ')}
          </span>
        )}
      </span>
    );
  }

  return (
    <>
      {/* TODO: 2FI-130 — ingredient routes will move to /ingredients/[slug] */}
      <Link
        href={`/ingredients/${ingredient.wikidata_id}`}
        className="link-content"
      >
        {ingredient.name}
      </Link>
      {hasAlternates && (
        <span className="text-ink-muted">
          {' '}
          / {ingredient.alternate_names.join(' / ')}
        </span>
      )}
    </>
  );
}

/**
 * Group ingredients by category. "other" goes into a separate bucket.
 */
function groupByCategory(ingredients: IngredientSummary[]): {
  categorized: Record<string, IngredientSummary[]>;
  other: IngredientSummary[];
} {
  const categorized: Record<string, IngredientSummary[]> = {};
  const other: IngredientSummary[] = [];

  for (const ingredient of ingredients) {
    if (!ingredient.category || ingredient.category === 'other') {
      other.push(ingredient);
    } else {
      if (!categorized[ingredient.category]) {
        categorized[ingredient.category] = [];
      }
      categorized[ingredient.category].push(ingredient);
    }
  }

  return { categorized, other };
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}
