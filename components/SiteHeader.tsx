import Link from 'next/link';

export default function SiteHeader() {
  return (
    <header className="border-b border-neutral-200 pb-4 mb-8 dark:border-neutral-800">
      <nav aria-label="Main navigation" className="flex items-baseline gap-6">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100"
        >
          Accidental Recipes
        </Link>
        <ul className="flex gap-4 text-sm" role="list">
          <li>
            <Link
              href="/"
              className="text-neutral-600 underline decoration-neutral-300 underline-offset-2 hover:text-neutral-900 hover:decoration-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:text-neutral-400 dark:decoration-neutral-600 dark:hover:text-neutral-100 dark:hover:decoration-neutral-400"
            >
              Recipes
            </Link>
          </li>
          <li>
            <Link
              href="/ingredients"
              className="text-neutral-600 underline decoration-neutral-300 underline-offset-2 hover:text-neutral-900 hover:decoration-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:text-neutral-400 dark:decoration-neutral-600 dark:hover:text-neutral-100 dark:hover:decoration-neutral-400"
            >
              Ingredients
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
