/**
 * Primary zone hero — compact header or responsive image.
 *
 * Hero images are not yet populated for any of the 56 recipes.
 * This is an intentional design state, not a bug.
 *
 * No image (current state): compact gray box with title. No forced
 * aspect ratio — shrinks to content height.
 *
 * With image (future): responsive layout that adapts to image shape.
 * On desktop, non-wide images (square, portrait) sit right with title
 * on the gray background left. On mobile, title box stacks above image.
 */
export default function HeroPlaceholder({
  title,
  imageSrc,
}: {
  title: string;
  imageSrc?: string | null;
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
              alt=""
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
