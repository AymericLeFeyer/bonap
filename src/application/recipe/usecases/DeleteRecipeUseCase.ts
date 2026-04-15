import type { IRecipeRepository } from "../../../domain/recipe/repositories/IRecipeRepository.ts"

export class DeleteRecipeUseCase {
  private recipeRepository: IRecipeRepository

  constructor(recipeRepository: IRecipeRepository) {
    this.recipeRepository = recipeRepository
  }

  async execute(slug: string): Promise<void> {
    await this.recipeRepository.delete(slug)
  }
}
