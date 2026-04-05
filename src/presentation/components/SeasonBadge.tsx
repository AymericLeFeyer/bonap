import type { Season } from "../../shared/types/mealie.ts"
import { SEASON_LABELS } from "../../shared/types/mealie.ts"
import { cn } from "../../lib/utils.ts"

/* Styles OKLCH cohérents avec la palette du design system */
const SEASON_STYLES: Record<Season, { pill: string; dot: string }> = {
  printemps: {
    pill: "bg-[oklch(0.94_0.06_150)] text-[oklch(0.32_0.10_150)] dark:bg-[oklch(0.25_0.06_150)] dark:text-[oklch(0.72_0.10_150)]",
    dot: "bg-[oklch(0.52_0.15_150)]",
  },
  ete: {
    pill: "bg-[oklch(0.95_0.07_85)] text-[oklch(0.38_0.12_70)] dark:bg-[oklch(0.28_0.06_80)] dark:text-[oklch(0.78_0.12_85)]",
    dot: "bg-[oklch(0.70_0.18_85)]",
  },
  automne: {
    pill: "bg-[oklch(0.94_0.06_50)] text-[oklch(0.40_0.12_40)] dark:bg-[oklch(0.26_0.06_45)] dark:text-[oklch(0.76_0.12_55)]",
    dot: "bg-[oklch(0.62_0.175_38)]",
  },
  hiver: {
    pill: "bg-[oklch(0.93_0.04_240)] text-[oklch(0.35_0.08_240)] dark:bg-[oklch(0.24_0.04_240)] dark:text-[oklch(0.72_0.08_240)]",
    dot: "bg-[oklch(0.52_0.14_240)]",
  },
  sans: {
    pill: "",
    dot: "",
  },
}

const SEASON_ICONS: Record<Season, string> = {
  printemps: "🌱",
  ete: "☀️",
  automne: "🍂",
  hiver: "❄️",
  sans: ""
}

interface SeasonBadgeProps {
  season: Season
  size?: "sm" | "md"
}

export function SeasonBadge({ season, size = "sm" }: SeasonBadgeProps) {
  const styles = SEASON_STYLES[season]

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold",
        styles.pill,
        size === "sm"
          ? "px-1.5 py-0.5 text-[10px]"
          : "px-2.5 py-1 text-xs",
      )}
    >
      <span role="img" aria-hidden="true" className="text-[11px]">
        {SEASON_ICONS[season]}
      </span>
      {SEASON_LABELS[season]}
    </span>
  )
}
