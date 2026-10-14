import type { NutritionFood, NutritionFoodPatch } from "../../../domain/nutrition/entities/NutritionFood.ts"
import type { INutritionRepository } from "../../../domain/nutrition/repositories/INutritionRepository.ts"

/** Correction d'une fiche par l'utilisateur : elle profite aussitôt à toutes les recettes. */
export class UpdateNutritionFoodUseCase {
  private readonly repository: INutritionRepository

  constructor(repository: INutritionRepository) {
    this.repository = repository
  }

  async execute(patch: Omit<NutritionFoodPatch, "origin">): Promise<NutritionFood> {
    const updated = await this.repository.saveFoods([{ ...patch, origin: "user" }])
    const entry = updated[patch.key]
    if (!entry) throw new Error("La fiche n'a pas pu être enregistrée (dictionnaire plein ?).")
    return entry
  }
}
