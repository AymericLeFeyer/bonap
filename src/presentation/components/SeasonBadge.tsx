import type { Season } from "../../shared/types/mealie.ts"
import { SEASON_LABELS } from "../../shared/types/mealie.ts"

const SEASON_STYLES: Record<Season, string> = {
  printemps:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  ete: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  automne:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  hiver: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
}

const SEASON_ICONS: Record<Season, string> = {
  printemps: "🌱",
  ete: "☀️",
  automne: "🍂",
  hiver: "❄️",
}

interface SeasonBadgeProps {
  season: Season
  size?: "sm" | "md"
}

export function SeasonBadge({ season, size = "sm" }: SeasonBadgeProps) {
  const baseClass =
    size === "sm"
      ? "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium"
      : "inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium"

  return (
    <span className={`${baseClass} ${SEASON_STYLES[season]}`}>
      <span role="img" aria-hidden="true">
        {SEASON_ICONS[season]}
      </span>
      {SEASON_LABELS[season]}
    </span>
  )
}
