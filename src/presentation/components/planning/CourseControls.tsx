import { Plus } from "lucide-react"
import type { Course } from "../../../shared/types/mealie.ts"
import { COURSE_LABELS } from "../../../shared/types/mealie.ts"
import { cn } from "../../../lib/utils.ts"

/** Étiquette affichée sur un repas entrée / dessert (rien pour un plat, le cas par défaut). */
export function CourseLabel({ course }: { course: Course }) {
  if (course === "plat") return null
  return (
    <span
      className={cn(
        "self-start rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-[0.08em]",
        course === "entree"
          ? "bg-[oklch(0.93_0.05_150)] text-[oklch(0.40_0.09_150)] dark:bg-[oklch(0.30_0.05_150)] dark:text-[oklch(0.85_0.07_150)]"
          : "bg-[oklch(0.93_0.05_350)] text-[oklch(0.42_0.11_350)] dark:bg-[oklch(0.30_0.06_350)] dark:text-[oklch(0.86_0.07_350)]",
      )}
    >
      {COURSE_LABELS[course]}
    </span>
  )
}

const OPTIONAL_COURSES: Array<{ course: Course; ariaLabel: string }> = [
  { course: "entree", ariaLabel: "Ajouter une entrée" },
  { course: "dessert", ariaLabel: "Ajouter un dessert" },
]

/** Boutons discrets pour ajouter une entrée ou un dessert au créneau, sans que ce soit obligatoire. */
export function OptionalCourseButtons({
  onAdd,
  size = "sm",
}: {
  onAdd: (course: Course) => void
  size?: "sm" | "md"
}) {
  return (
    <div className="flex gap-1">
      {OPTIONAL_COURSES.map(({ course, ariaLabel }) => (
        <button
          key={course}
          type="button"
          onClick={() => onAdd(course)}
          aria-label={ariaLabel}
          className={cn(
            "flex flex-1 items-center justify-center gap-1 rounded-[var(--radius-md)]",
            "font-medium text-muted-foreground/70",
            "hover:bg-primary/4 hover:text-primary transition-colors duration-150",
            size === "sm" ? "py-1 text-[10.5px]" : "py-1.5 text-xs",
          )}
        >
          <Plus className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
          {COURSE_LABELS[course]}
        </button>
      ))}
    </div>
  )
}
