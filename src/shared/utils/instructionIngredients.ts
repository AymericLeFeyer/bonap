import type { MealieIngredient, MealieInstruction } from "../types/mealie.ts"

/**
 * Ingrédients associés à une étape dans Mealie.
 *
 * Mealie relie les deux via `instruction.ingredientReferences[].referenceId`
 * et `ingredient.referenceId`. Les recettes qui n'utilisent pas cette
 * association renvoient une liste vide — l'appelant n'affiche alors rien.
 *
 * L'ordre suit celui de la liste d'ingrédients de la recette, pas celui des
 * références, pour rester cohérent avec l'écran « Ingrédients ».
 */
export function ingredientsForInstruction(
  instruction: MealieInstruction,
  ingredients: MealieIngredient[],
): MealieIngredient[] {
  const referenced = new Set(
    (instruction.ingredientReferences ?? [])
      .map((ref) => ref.referenceId)
      .filter(Boolean),
  )
  if (referenced.size === 0) return []
  return ingredients.filter((ing) => ing.referenceId && referenced.has(ing.referenceId))
}
