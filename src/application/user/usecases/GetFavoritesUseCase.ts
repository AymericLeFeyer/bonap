import type { IRecipeRepository } from "../../../domain/recipe/repositories/IRecipeRepository.ts"
import type { MealieFavoritesResponse } from "../../../shared/types/mealie.ts"

export class GetFavoritesUseCase {
    private recipeRepository: IRecipeRepository

    constructor(recipeRepository: IRecipeRepository) {
        this.recipeRepository = recipeRepository
    }

     async execute(): Promise<MealieFavoritesResponse> {
        return this.recipeRepository.getFavorites()
    }
    
}