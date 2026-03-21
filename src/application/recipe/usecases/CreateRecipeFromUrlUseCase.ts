import type { IRecipeRepository } from "../../../domain/recipe/repositories/IRecipeRepository.ts"

export class CreateRecipeFromUrlUseCase {
  private recipeRepository: IRecipeRepository

  constructor(recipeRepository: IRecipeRepository) {
    this.recipeRepository = recipeRepository
  }

  async execute(url: string): Promise<string> {
    return this.recipeRepository.createFromUrl(url)
  }
}
