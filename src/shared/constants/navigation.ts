/**
 * Destinations de navigation principales, dans l'ordre d'affichage de la sidebar.
 *
 * Sans icône : ce module est aussi lu par l'infrastructure (validation de la
 * page d'accueil enregistrée), qui ne doit rien savoir de la présentation. Les
 * icônes sont associées dans `presentation/components/navItems.ts`.
 */
export interface NavRoute {
  to: string
  label: string
  /** La destination n'est disponible que si un fournisseur LLM est configuré. */
  requiresAI?: boolean
}

export const NAV_ROUTES: NavRoute[] = [
  { to: "/planning", label: "Planning" },
  { to: "/shopping", label: "Courses" },
  { to: "/recipes", label: "Recettes" },
  { to: "/suggestions", label: "Suggestions IA", requiresAI: true },
  { to: "/explore", label: "Explorer" },
  { to: "/stats", label: "Statistiques" },
]

/** Destinations visibles selon que l'IA est configurée ou non. */
export function visibleNavRoutes(isAIEnabled: boolean): NavRoute[] {
  return NAV_ROUTES.filter((route) => !route.requiresAI || isAIEnabled)
}
