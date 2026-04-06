import Link from 'next/link';

/**
 * Custom 404 page — app/not-found.tsx (2FI-177)
 *
 * Renders inside root layout (SiteHeader already present above).
 * Brand tokens only — no images, no decorative elements.
 */
export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-3 text-ink-secondary">
        The page you requested does not exist or has moved.
      </p>
      <nav className="mt-6 flex justify-center gap-6 text-sm" aria-label="Recovery navigation">
        <Link href="/" className="link-secondary">
          Home
        </Link>
        <Link href="/ingredients" className="link-secondary">
          Ingredients
        </Link>
      </nav>
    </div>
  );
}
