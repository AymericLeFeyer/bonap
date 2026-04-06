/**
 * Dependency container — singleton module.
 *
 * All repository and use case instances are created once
 * and shared throughout the application. Hooks import directly
 * from this file instead of instantiating their own dependencies.
 */


//Auth Services
import { AuthService } from "./mealie/auth/AuthService.ts"

// Repositories
import { RecipeRepository } from './mealie/repositories/RecipeRepository.ts'
import { PlanningRepository } from './mealie/repositories/PlanningRepository.ts'
import { ShoppingRepository } from './mealie/repositories/ShoppingRepository.ts'
import { CategoryRepository } from './mealie/repositories/CategoryRepository.ts'
import { TagRepository } from './mealie/repositories/TagRepository.ts'
import { FoodRepository } from './mealie/repositories/FoodRepository.ts'
import { UnitRepository } from './mealie/repositories/UnitRepository.ts'
import { AuthRepository } from './mealie/repositories/AuthRepository.ts'

// Use cases — auth
import { LoginUseCase } from '../application/auth/usecases/LoginUseCase.ts'
import { LogoutUseCase } from '../application/auth/usecases/LogoutUseCase.ts'

// Use cases — recipe
import { GetRecipesUseCase } from "../application/recipe/usecases/GetRecipesUseCase.ts"
import { GetRecipeUseCase } from "../application/recipe/usecases/GetRecipeUseCase.ts"
import { GetRecipesByIdsUseCase } from "../application/recipe/usecases/GetRecipesByIdsUseCase.ts"
import { CreateRecipeUseCase } from "../application/recipe/usecases/CreateRecipeUseCase.ts"
import { UpdateRecipeUseCase } from "../application/recipe/usecases/UpdateRecipeUseCase.ts"
import { UpdateSeasonsUseCase } from "../application/recipe/usecases/UpdateSeasonsUseCase.ts"
import { UpdateCalorieTagUseCase } from "../application/recipe/usecases/UpdateCalorieTagUseCase.ts"
import { UpdateCategoriesUseCase } from "../application/recipe/usecases/UpdateCategoriesUseCase.ts"
import { FetchAiImageUseCase } from "../application/recipe/usecases/FetchAiImageUseCase.ts"

// Use caese - User
import { UpdateRatingUseCase } from "../application/user/usecases/UpdateRatingUseCase.ts"
import { GetFavoritesUseCase } from "../application/user/usecases/GetFavoritesUseCase.ts"
import { ToggleFavoriteUseCase } from "../application/user/usecases/ToggleFavoriteUseCase.ts"

// Use cases — planning
import { GetWeekPlanningUseCase } from '../application/planning/usecases/GetWeekPlanningUseCase.ts'
import { GetPlanningRangeUseCase } from '../application/planning/usecases/GetPlanningRangeUseCase.ts'
import { AddMealUseCase } from '../application/planning/usecases/AddMealUseCase.ts'
import { DeleteMealUseCase } from '../application/planning/usecases/DeleteMealUseCase.ts'

// Use cases — shopping
import { GetShoppingItemsUseCase } from '../application/shopping/usecases/GetShoppingItemsUseCase.ts'
import { AddItemUseCase } from '../application/shopping/usecases/AddItemUseCase.ts'
import { AddRecipesToListUseCase } from '../application/shopping/usecases/AddRecipesToListUseCase.ts'
import { ToggleItemUseCase } from '../application/shopping/usecases/ToggleItemUseCase.ts'
import { DeleteItemUseCase } from '../application/shopping/usecases/DeleteItemUseCase.ts'
import { ClearListUseCase } from '../application/shopping/usecases/ClearListUseCase.ts'

// Use cases — organizer
import { GetCategoriesUseCase } from '../application/organizer/usecases/GetCategoriesUseCase.ts'
import { GetTagsUseCase } from '../application/organizer/usecases/GetTagsUseCase.ts'
import { GetFoodsUseCase } from '../application/organizer/usecases/GetFoodsUseCase.ts'
import { CreateFoodUseCase } from '../application/organizer/usecases/CreateFoodUseCase.ts'
import { GetUnitsUseCase } from '../application/organizer/usecases/GetUnitsUseCase.ts'

//Auth Services
export const authService = new AuthService()


// --- Singleton repository instances ---

export const recipeRepository = new RecipeRepository(authService)
export const planningRepository = new PlanningRepository()
export const shoppingRepository = new ShoppingRepository()
export const categoryRepository = new CategoryRepository()
export const tagRepository = new TagRepository()
export const foodRepository = new FoodRepository()
export const unitRepository = new UnitRepository()
export const authRepository = new AuthRepository()

// --- Singleton use case instances — recipe ---

export const getRecipesUseCase = new GetRecipesUseCase(recipeRepository)
export const getRecipeUseCase = new GetRecipeUseCase(recipeRepository)
export const getRecipesByIdsUseCase = new GetRecipesByIdsUseCase(
  recipeRepository,
)
export const createRecipeUseCase = new CreateRecipeUseCase(
  recipeRepository,
  foodRepository,
  unitRepository,
)
export const updateRecipeUseCase = new UpdateRecipeUseCase(
  recipeRepository,
  foodRepository,
  unitRepository,
)
export const updateSeasonsUseCase = new UpdateSeasonsUseCase(recipeRepository)
export const updateCalorieTagUseCase = new UpdateCalorieTagUseCase(recipeRepository)
export const updateCategoriesUseCase = new UpdateCategoriesUseCase(recipeRepository)
export const fetchAiImageUseCase = new FetchAiImageUseCase()

// --- Singleton use case instances — User ---
export const updateRatingUseCase = new UpdateRatingUseCase(recipeRepository)
export const getFavoritesUseCase = new GetFavoritesUseCase(recipeRepository)
export const toggleFavoriteUseCase = new ToggleFavoriteUseCase(recipeRepository)

// --- Singleton use case instances — planning ---

export const getWeekPlanningUseCase = new GetWeekPlanningUseCase(
  planningRepository,
)
export const getPlanningRangeUseCase = new GetPlanningRangeUseCase(
  planningRepository,
)
export const addMealUseCase = new AddMealUseCase(planningRepository)
export const deleteMealUseCase = new DeleteMealUseCase(planningRepository)

// --- Singleton use case instances — shopping ---

export const getShoppingItemsUseCase = new GetShoppingItemsUseCase(
  shoppingRepository,
)
export const addItemUseCase = new AddItemUseCase(shoppingRepository)
export const addRecipesToListUseCase = new AddRecipesToListUseCase(
  shoppingRepository,
)
export const toggleItemUseCase = new ToggleItemUseCase(shoppingRepository)
export const deleteItemUseCase = new DeleteItemUseCase(shoppingRepository)
export const clearListUseCase = new ClearListUseCase(shoppingRepository)

// --- Singleton use case instances — organizer ---

export const getCategoriesUseCase = new GetCategoriesUseCase(categoryRepository)
export const getTagsUseCase = new GetTagsUseCase(tagRepository)
export const getFoodsUseCase = new GetFoodsUseCase(foodRepository)
export const createFoodUseCase = new CreateFoodUseCase(foodRepository)
export const getUnitsUseCase = new GetUnitsUseCase(unitRepository)

// --- Singleton use case instances — auth ---

export const loginUseCase = new LoginUseCase(authRepository)
export const logoutUseCase = new LogoutUseCase(authRepository)
