import { useState, useEffect } from "react"
import type { MealieRecipe } from "../../shared/types/mealie.ts"
import { recipeImageUrl } from "../../shared/utils/image.ts"
import { getRecipeEmoji, EXTRAS_EMOJI_KEY } from "../../shared/utils/recipeEmoji.ts"
import { recipeEmojiStore } from "../../infrastructure/recipe/RecipeEmojiStore.ts"
import { getRecipeUseCase } from "../../infrastructure/container.ts"
import { cn } from "../../lib/utils.ts"

interface RecipeImageProps {
  recipe: Pick<MealieRecipe, "id" | "slug" | "extras">
  alt?: string
  className?: string
  fallbackClassName?: string
}

export function RecipeImage({ recipe, alt = "", className, fallbackClassName }: RecipeImageProps) {
  const [imgError, setImgError] = useState(false)
  const [emoji, setEmoji] = useState<string | null>(() => getRecipeEmoji(recipe))
  const imageUrl = recipeImageUrl(recipe, "min-original")

  useEffect(() => {
    if (!imgError || emoji !== null) return
    let cancelled = false
    getRecipeUseCase.execute(recipe.slug).then((full) => {
      if (cancelled) return
      const e = full.extras?.[EXTRAS_EMOJI_KEY] ?? null
      if (e) {
        recipeEmojiStore.set(full.id, e)
        setEmoji(e)
      }
    }).catch(() => {})
    return () => { cancelled = true }
  }, [imgError, emoji, recipe.slug])

  if (!imgError) {
    return (
      <img
        src={imageUrl}
        alt={alt}
        className={className}
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <div className={cn("flex items-center justify-center bg-muted", fallbackClassName ?? className)}>
      <span className="text-2xl">{emoji ?? "🍽️"}</span>
    </div>
  )
}
