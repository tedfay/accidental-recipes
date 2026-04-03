import type { IngredientLine } from '@/types/recipe';
import IngredientLineItem from '@/components/IngredientLineItem';

export default function IngredientList({
  ingredients,
}: {
  ingredients: IngredientLine[];
}) {
  return (
    <section aria-labelledby="ingredients-heading">
      <h2
        id="ingredients-heading"
        className="text-lg font-semibold tracking-tight"
      >
        Ingredients
      </h2>
      <ul role="list" className="mt-3 pl-6">
        {ingredients.map((ingredient, i) => (
          <IngredientLineItem
            key={i}
            ingredient={ingredient}
          />
        ))}
      </ul>
      <p className="mt-3 pl-6 text-xs text-neutral-400 dark:text-neutral-500">
        <span className="mr-1.5 inline-block h-[7px] w-[7px] translate-y-[-1px] rounded-full bg-neutral-400 dark:bg-neutral-500" aria-hidden="true" />
        linked to knowledge graph
        <span className="mx-2" aria-hidden="true">&middot;</span>
        <span className="mr-1.5 inline-block h-[7px] w-[7px] translate-y-[-1px] rounded-full border border-neutral-400 dark:border-neutral-500" aria-hidden="true" />
        not yet linked
      </p>
    </section>
  );
}
