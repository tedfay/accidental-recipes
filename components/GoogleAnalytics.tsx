'use client';

/**
 * GA4 script loader — consent-gated (2FI-169).
 *
 * Renders nothing when:
 * - No measurement ID configured (siteConfig.analytics.gaMeasurementId is null)
 * - Analytics consent has not been granted
 *
 * Listens for 'consent-updated' event from ConsentBanner to load
 * scripts immediately after the user accepts.
 *
 * Tracks route changes via usePathname().
 */

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { siteConfig } from '@/lib/site-config';
import { hasAnalyticsConsent } from '@/lib/consent';

const GA_ID = siteConfig.analytics.gaMeasurementId;

export default function GoogleAnalytics() {
  const [consentGranted, setConsentGranted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (hasAnalyticsConsent()) setConsentGranted(true);

    function onConsentUpdate() {
      if (hasAnalyticsConsent()) setConsentGranted(true);
    }

    window.addEventListener('consent-updated', onConsentUpdate);
    return () => window.removeEventListener('consent-updated', onConsentUpdate);
  }, []);

  useEffect(() => {
    if (consentGranted && GA_ID && window.gtag) {
      window.gtag('config', GA_ID, { page_path: pathname });
    }
  }, [pathname, consentGranted]);

  if (!GA_ID || !consentGranted) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { page_path: '${pathname}' });
        `}
      </Script>
    </>
  );
}
