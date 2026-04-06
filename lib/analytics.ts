/**
 * Analytics event dispatch — consent-gated (2FI-103).
 *
 * Every event is gated on hasAnalyticsConsent(). If consent is not
 * granted, all track* functions are no-ops. Every payload includes
 * consent_given: boolean. Property names use snake_case (BigQuery-bound).
 *
 * Fires via window.gtag when the GA4 script is loaded.
 */

import { hasAnalyticsConsent } from '@/lib/consent';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function trackEvent(
  name: string,
  properties: Record<string, unknown>,
): void {
  if (!hasAnalyticsConsent()) return;
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', name, {
    ...properties,
    consent_given: true,
  });
}

/* ── Typed event helpers (CLAUDE.md spec) ─────────────────────── */

export function trackPageView(props: {
  page_type: string;
  slug: string;
  referrer: string;
}): void {
  trackEvent('page_view', props);
}

export function trackRecipeView(props: {
  slug: string;
  source: 'browse' | 'search' | 'direct';
}): void {
  trackEvent('recipe_view', props);
}

export function trackIngredientEntityClick(props: {
  ingredient_name: string;
  wikidata_id: string;
  recipe_slug: string;
}): void {
  trackEvent('ingredient_entity_click', props);
}

export function trackSignalZoneToggle(props: {
  state: 'open' | 'close';
  recipe_slug: string;
}): void {
  trackEvent('signal_zone_toggle', props);
}

export function trackSearchQuery(props: {
  query: string;
  result_count: number;
}): void {
  trackEvent('search_query', props);
}

export function trackBrowseFilterApplied(props: {
  filter_type: string;
  filter_value: string;
}): void {
  trackEvent('browse_filter_applied', props);
}
