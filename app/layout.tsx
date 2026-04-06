import '@/lib/env';
import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Accidental Recipes',
    template: '%s | Accidental Recipes',
  },
  description: 'Recipes as structured data objects, enriched with Wikidata entities.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-canvas text-ink font-body antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-ink focus:px-3 focus:py-1.5 focus:text-sm focus:text-canvas"
        >
          Skip to content
        </a>
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <SiteHeader />
          <main id="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
