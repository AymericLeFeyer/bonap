import { UtensilsCrossed, CalendarDays, BarChart2, ShoppingCart, Sparkles, Globe } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { visibleNavRoutes } from "../../shared/constants/navigation.ts"
import type { NavRoute } from "../../shared/constants/navigation.ts"

export interface NavItem extends NavRoute {
  icon: LucideIcon
}

const ICONS: Record<string, LucideIcon> = {
  "/planning": CalendarDays,
  "/shopping": ShoppingCart,
  "/recipes": UtensilsCrossed,
  "/suggestions": Sparkles,
  "/explore": Globe,
  "/stats": BarChart2,
}

/**
 * Entrées de navigation affichables, icône comprise.
 * Partagé entre la sidebar et le sélecteur de page d'accueil des paramètres,
 * pour que les deux listes ne puissent pas diverger.
 */
export function visibleNavItems(isAIEnabled: boolean): NavItem[] {
  return visibleNavRoutes(isAIEnabled).map((route) => ({
    ...route,
    icon: ICONS[route.to] ?? UtensilsCrossed,
  }))
}
