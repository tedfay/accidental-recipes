import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getRecipe, getSeoMetadata } from '@/lib/mcp-client';
import { resolveTitle } from '@/lib/title';
import HeroPlaceholder from '@/components/HeroPlaceholder';
import IngredientList from '@/components/IngredientList';
import StepList from '@/components/StepList';
import SignalZone from '@/components/SignalZone';

/**
 * Recipe detail page — /recipes/[slug]
 *
 * Two MCP calls on page load: get_recipe(slug) and get_seo_metadata(slug).
 * Three zones rendered in order: primary, structured data, signal.
 *
 * JSON-LD is injected verbatim from get_seo_metadata. The frontend does
 * not modify the blob — the MCP server owns the JSON-LD shape.
 *
 * Static generation requires the MCP server at build time (2FI-100).
 */
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const recipe = await getRecipe(slug);
    const title = resolveTitle(recipe, slug);

    return {
      title,
      // Omit description entirely when headnote is null (null field rule)
      ...(recipe.headnote ? { description: recipe.headnote } : {}),
      alternates: { canonical: `/recipes/${slug}` },
    };
  } catch {
    return {};
  }
}

export default async function RecipePage({ params }: PageProps) {
  const { slug } = await params;

  let recipe;
  let seoData;

  try {
    [recipe, seoData] = await Promise.all([
      getRecipe(slug),
      getSeoMetadata(slug),
    ]);
  } catch {
    notFound();
  }

  const title = resolveTitle(recipe, slug);

  return (
    <>
      {/* JSON-LD — injected verbatim, never modified */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(seoData) }}
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-ink-muted">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link
              href="/"
              className="link-secondary"
            >
              Recipes
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{title}</li>
        </ol>
      </nav>

      <article>
        {/* ── Primary zone ─────────────────────────────────────── */}
        <HeroPlaceholder title={title} imageSrc={recipe.meta?.ogImage} />

        {recipe.headnote && (
          <p className="mt-6 text-ink-secondary leading-relaxed">
            {recipe.headnote}
          </p>
        )}

        {/* ── Structured data zone ─────────────────────────────── */}
        <div className="mt-8">
          <IngredientList ingredients={recipe.ingredients} />
          <StepList steps={recipe.steps} />
        </div>

        {/* ── Signal zone ──────────────────────────────────────── */}
        <SignalZone
          ingredients={recipe.ingredients}
          enrichment={recipe.enrichment}
        />
      </article>
    </>
  );
}
