'use client';

/**
 * GDPR/CCPA consent banner (2FI-103).
 *
 * Shown on first visit when no consent state exists in localStorage.
 * Two equally prominent buttons — no dark patterns.
 * Dispatches 'consent-updated' event so GA4/GTM components can react.
 */

import { useEffect, useState } from 'react';
import {
  getConsent,
  grantAnalyticsConsent,
  denyAnalyticsConsent,
} from '@/lib/consent';

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getConsent() === null) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function handleAccept() {
    grantAnalyticsConsent();
    setVisible(false);
    window.dispatchEvent(new Event('consent-updated'));
  }

  function handleDecline() {
    denyAnalyticsConsent();
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-canvas px-4 py-4 sm:px-6"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-secondary">
          This site uses analytics to understand how recipes are found and
          used. No personal data is collected.
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={handleDecline}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink-secondary hover:bg-canvas-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="rounded-md bg-sage px-4 py-2 text-sm font-medium text-white hover:bg-sage-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          >
            Accept analytics
          </button>
        </div>
      </div>
    </div>
  );
}
