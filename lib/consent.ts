/**
 * Consent state management — GDPR/CCPA compliant (2FI-103).
 *
 * Reads/writes localStorage under siteConfig.consent.storageKey.
 * All functions are SSR-safe (guard on typeof window).
 *
 * Platform-portable: storage key and version come from site-config.ts.
 */

import { siteConfig } from '@/lib/site-config';

export interface ConsentState {
  analytics: boolean;
  /** Stubbed false — reserved for Phase 3+ */
  functional: boolean;
  /** Stubbed false — reserved for Phase 3+ */
  personalization: boolean;
  version: string;
  timestamp: string;
}

const STORAGE_KEY = siteConfig.consent.storageKey;
const CONSENT_VERSION = siteConfig.consent.version;

export function getConsent(): ConsentState | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConsentState;
  } catch {
    return null;
  }
}

export function setConsent(consent: ConsentState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
}

export function hasAnalyticsConsent(): boolean {
  return getConsent()?.analytics === true;
}

export function grantAnalyticsConsent(): void {
  setConsent({
    analytics: true,
    functional: false,
    personalization: false,
    version: CONSENT_VERSION,
    timestamp: new Date().toISOString(),
  });
}

export function denyAnalyticsConsent(): void {
  setConsent({
    analytics: false,
    functional: false,
    personalization: false,
    version: CONSENT_VERSION,
    timestamp: new Date().toISOString(),
  });
}
