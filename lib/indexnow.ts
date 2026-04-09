import { siteConfig } from './site-config';

/**
 * Fire-and-forget IndexNow URL submission.
 *
 * Submits URLs to the IndexNow API so Bing, Yandex, Seznam, and Naver
 * discover content changes without waiting for their next crawl cycle.
 *
 * No-ops gracefully when INDEXNOW_API_KEY is not set (local dev).
 * Never throws — logs errors and returns void.
 */
export async function submitToIndexNow(urls: string[]): Promise<void> {
  const { apiKey } = siteConfig.indexNow;

  if (!apiKey) {
    console.warn('[indexnow] INDEXNOW_API_KEY not set — skipping submission');
    return;
  }

  if (urls.length === 0) return;

  const host = new URL(siteConfig.url).host;
  const keyLocation = `${siteConfig.url}/${apiKey}.txt`;

  try {
    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key: apiKey,
        keyLocation,
        urlList: urls,
      }),
    });

    if (response.ok || response.status === 202) {
      console.log(`[indexnow] Submitted ${urls.length} URL(s) — status ${response.status}`);
    } else {
      const body = await response.text().catch(() => '');
      console.error(`[indexnow] Submission failed — status ${response.status}: ${body}`);
    }
  } catch (err) {
    console.error('[indexnow] Submission error:', err);
  }
}

/**
 * Build full URLs from recipe slugs and submit to IndexNow.
 */
export async function submitSlugsToIndexNow(slugs: string[]): Promise<void> {
  const base = siteConfig.url;
  const urls = slugs.map((slug) => `${base}/recipes/${slug}`);
  return submitToIndexNow(urls);
}
