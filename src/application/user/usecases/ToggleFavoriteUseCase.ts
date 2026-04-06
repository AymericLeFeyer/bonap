import type { IRecipeRepository } from "../../../domain/recipe/repositories/IRecipeRepository.ts"

export class ToggleFavoriteUseCase {
    private recipeRepository: IRecipeRepository

    constructor(recipeRepository: IRecipeRepository) {
        this.recipeRepository = recipeRepository
    }

    async execute(slug: string, isFavorite: boolean): Promise<void> {
        return this.recipeRepository.toggleFavorite(slug, isFavorite)
    }
}