'use client';

/**
 * GTM container loader — consent-gated (2FI-172).
 *
 * For tags beyond GA4 (marketing pixels, future tooling).
 * GA4 fires directly via gtag in GoogleAnalytics.tsx — NOT through GTM.
 * Do not add a GA4 tag inside the GTM container.
 *
 * Renders nothing when:
 * - No GTM ID configured (siteConfig.analytics.gtmId is null)
 * - Analytics consent has not been granted
 */

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { siteConfig } from '@/lib/site-config';
import { hasAnalyticsConsent } from '@/lib/consent';

const GTM_ID = siteConfig.analytics.gtmId;

export default function GoogleTagManager() {
  const [consentGranted, setConsentGranted] = useState(false);

  useEffect(() => {
    if (hasAnalyticsConsent()) setConsentGranted(true);

    function onConsentUpdate() {
      if (hasAnalyticsConsent()) setConsentGranted(true);
    }

    window.addEventListener('consent-updated', onConsentUpdate);
    return () => window.removeEventListener('consent-updated', onConsentUpdate);
  }, []);

  if (!GTM_ID || !consentGranted) return null;

  return (
    <>
      <Script id="gtm-init" strategy="afterInteractive">
        {`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${GTM_ID}');
        `}
      </Script>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
        />
      </noscript>
    </>
  );
}
