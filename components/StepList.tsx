import type { RecipeStep } from '@/types/recipe';

/**
 * Numbered instruction steps rendered as discrete chunks.
 * Each step is its own <li> — not prose. This serves users with
 * attention differences and is consistent with content-as-data.
 *
 * Component structure accepts optional imageSrc per step for future use.
 * The image slot is not rendered now (not in current data shape).
 */
export default function StepList({
  steps,
}: {
  steps: RecipeStep[];
}) {
  const sorted = [...steps].sort((a, b) => a.order - b.order);

  return (
    <section aria-labelledby="steps-heading" className="mt-8">
      <h2
        id="steps-heading"
        className="text-lg font-semibold tracking-tight"
      >
        Instructions
      </h2>
      <ol role="list" className="mt-3 list-decimal space-y-4 pl-6 marker:text-ink-muted marker:font-medium">
        {sorted.map((step) => (
          <Step key={step.order} step={step} />
        ))}
      </ol>
    </section>
  );
}

function Step({
  step,
  imageSrc,
}: {
  step: RecipeStep;
  imageSrc?: string | null;
}) {
  return (
    <li className="text-ink">
      <p>{step.text}</p>
      {/* Image slot — not rendered until step-level images are in the data shape */}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={`Step ${step.order}`}
          className="mt-2 rounded"
        />
      )}
    </li>
  );
}
