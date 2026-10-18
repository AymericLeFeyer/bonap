import type { Course } from "../../shared/types/mealie.ts"
import { COURSES, COURSE_LABELS } from "../../shared/types/mealie.ts"
import { Badge } from "./ui/badge.tsx"
import { cn } from "../../lib/utils.ts"

/**
 * Choix entrée / plat / dessert d'une recette. Plusieurs types possibles
 * (une quiche peut être entrée ou plat), au moins un toujours sélectionné.
 */
export function CourseToggleGroup({
  value,
  onToggle,
  disabled,
  className,
  label,
}: {
  value: Course[]
  onToggle: (course: Course) => void
  disabled?: boolean
  className?: string
  /** Affiche « Type : » devant les choix (utile à côté des catégories). */
  label?: boolean
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)} role="group" aria-label="Type de plat">
      {label && <span className="mr-0.5 text-xs font-medium text-muted-foreground">Type :</span>}
      {COURSES.map((course) => {
        const active = value.includes(course)
        const isLastActive = active && value.length === 1
        return (
          <Badge
            key={course}
            role="button"
            aria-pressed={active}
            title={isLastActive ? "Au moins un type est requis" : undefined}
            variant={active ? "default" : "outline"}
            className={cn(
              "select-none transition-colors text-xs",
              disabled || isLastActive ? "cursor-default" : "cursor-pointer",
              disabled && "opacity-60",
            )}
            onClick={() => { if (!disabled && !isLastActive) onToggle(course) }}
          >
            {COURSE_LABELS[course]}
          </Badge>
        )
      })}
    </div>
  )
}
