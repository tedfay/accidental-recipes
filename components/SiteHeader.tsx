import Link from 'next/link';

export default function SiteHeader() {
  return (
    <header className="border-b border-border pb-4 mb-8">
      <nav aria-label="Main navigation" className="flex items-baseline gap-6">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-ink"
        >
          Accidental Recipes
        </Link>
        <ul className="flex gap-4 text-sm" role="list">
          <li>
            <Link href="/" className="link-secondary">
              Recipes
            </Link>
          </li>
          <li>
            <Link href="/ingredients" className="link-secondary">
              Ingredients
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
