import type { IRecipeRepository } from "../../../domain/recipe/repositories/IRecipeRepository.ts"

export class UpdateRatingUseCase {
    private recipeRepository: IRecipeRepository

    constructor(recipeRepository: IRecipeRepository) {
        this.recipeRepository = recipeRepository
    }

    async execute(slug: string, rating: number): Promise<void> {
        return this.recipeRepository.updateRating(slug, rating)
    }
}