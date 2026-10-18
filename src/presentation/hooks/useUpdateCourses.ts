import { useState } from "react"
import { updateCoursesUseCase } from "../../infrastructure/container.ts"
import type { Course, MealieRecipe } from "../../shared/types/mealie.ts"

export function useUpdateCourses() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateCourses = async (
    slug: string,
    courses: Course[],
  ): Promise<MealieRecipe | null> => {
    setLoading(true)
    setError(null)
    try {
      return await updateCoursesUseCase.execute(slug, courses)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de mettre à jour le type de plat. Veuillez réessayer.",
      )
      return null
    } finally {
      setLoading(false)
    }
  }

  return { updateCourses, loading, error }
}
