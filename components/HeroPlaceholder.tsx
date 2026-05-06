/**
 * Primary zone hero — compact header or responsive image.
 *
 * No image: compact gray box with title.
 *
 * With image: responsive layout that adapts to image shape. On desktop,
 * non-wide images sit right with title on the gray background left;
 * mobile stacks the title box above the image.
 *
 * Caller passes resolved imageSrc + alt — this component does not know
 * about storage paths or the URL resolver. Alt is required when an
 * image is present, optional when not. (2FI-215)
 */
export default function HeroPlaceholder({
  title,
  imageSrc,
  imageAlt,
}: {
  title: string;
  imageSrc?: string | null;
  imageAlt?: string | null;
}) {
  if (imageSrc) {
    return (
      <div className="overflow-hidden rounded-lg bg-canvas-raised">
        {/* Mobile: stack vertically. Desktop: title left, image right */}
        <div className="flex flex-col sm:flex-row">
          <div className="flex items-end p-6 sm:flex-1">
            <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              {title}
            </h1>
          </div>
          <div className="sm:flex-1">
            <img
              src={imageSrc}
              alt={imageAlt ?? ''}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[4rem] rounded-lg bg-canvas-raised px-6 py-8">
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        {title}
      </h1>
    </div>
  );
}
