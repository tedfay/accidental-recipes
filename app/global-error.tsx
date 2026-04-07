'use client';

import * as Sentry from '@sentry/nextjs';
import { Inter } from 'next/font/google';
import { useEffect } from 'react';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-inter',
});

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-canvas text-ink font-body antialiased">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Something went wrong
          </h1>
          <p className="mt-3 text-ink-secondary">
            An unexpected error occurred. The error has been reported.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 rounded-md bg-sage px-4 py-2 text-sm font-medium text-white hover:bg-sage-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
