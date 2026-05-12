/**
 * Platform-generic enrichment types.
 *
 * Any content object (recipe, product, article, place) can carry a
 * ContentEnrichment. The recipe page is the first consumer; future Biga
 * surfaces will reuse the same shape.
 */

/** Individual enrichment signal */
export interface EnrichmentSignal {
  type: string;
  notes: string;
  resolved: boolean;
  triggeredAt: string;
}

/** Enrichment data attached to any content object */
export interface ContentEnrichment {
  signals: EnrichmentSignal[];
  lastEnrichedAt: string;
  enrichmentVersion: number;
}
