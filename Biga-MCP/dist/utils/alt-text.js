/**
 * Deterministic alt text generation from recipe data.
 *
 * Pattern: "{dish name} with {key visible ingredients}"
 * Max 125 characters. No "image of" or "photo of" prefix.
 * Same input always produces the same output.
 */
const MAX_ALT_LENGTH = 125;
/**
 * Strip leading quantity and unit from a rawString to extract the ingredient name.
 * e.g. "2 cups all-purpose flour" → "all-purpose flour"
 *      "1/2 tsp kosher salt" → "kosher salt"
 */
function extractIngredientName(rawString) {
    return rawString
        .replace(/^[\d/.¼½¾⅓⅔⅛⅜⅝⅞]+\s*/, '') // leading quantity
        .replace(/^(?:cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|g|grams?|kg|ml|liters?|quarts?|pints?|gallons?|bunch|bunches|cloves?|heads?|stalks?|sprigs?|pinch(?:es)?|dash(?:es)?|cans?|jars?|packages?|pieces?|slices?|large|medium|small)\s+/i, '')
        .trim();
}
export function generateAltText(recipe) {
    const dishName = recipe.title;
    const keyIngredients = recipe.ingredients
        .slice(0, 3)
        .map((ing) => ing.entity?.name ?? extractIngredientName(ing.rawString))
        .filter((name) => name.length > 0);
    let alt;
    if (keyIngredients.length > 0) {
        alt = `${dishName} with ${keyIngredients.join(', ')}`;
    }
    else {
        alt = dishName;
    }
    if (alt.length > MAX_ALT_LENGTH) {
        alt = alt.slice(0, MAX_ALT_LENGTH - 3).replace(/,?\s+\S*$/, '...');
    }
    return alt;
}
