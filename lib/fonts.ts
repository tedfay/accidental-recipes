/**
 * Inter, self-hosted. Shared by app/layout.tsx and app/global-error.tsx
 * so the two can't drift.
 *
 * Self-hosted rather than next/font/google: Google Fonts sometimes serves
 * build machines extensionless font URLs, which crashes next/font's Google
 * loader at build time (vercel/next.js#99114) and failed two production
 * deploys on 2026-10-23.
 *
 * The file is the latin subset Google Fonts serves for
 * Inter:wght@400;500;600 (Inter 4.001, Google Fonts v20): one variable
 * file with a wght axis, the same file next/font/google downloaded.
 * License: app/fonts/OFL.txt.
 */
import localFont from 'next/font/local';

export const inter = localFont({
  src: '../app/fonts/inter-latin-wght.woff2',
  // Matches the old 400/500/600 faces: heavier requests clamp to 600.
  weight: '400 600',
  style: 'normal',
  display: 'swap',
  variable: '--font-inter',
});
