import { NavLink } from "react-router-dom"
import { UtensilsCrossed, CalendarDays, ChevronLeft, ChevronRight, Sun, Moon, ExternalLink } from "lucide-react"
import { cn } from "../../lib/utils.ts"
import { useTheme } from "../hooks/useTheme.ts"

const navItems = [
  { to: "/recipes", label: "Recettes", icon: UtensilsCrossed },
  { to: "/planning", label: "Planning", icon: CalendarDays },
]

interface SidebarProps {
  collapsed: boolean
  onToggleCollapsed: () => void
  onClose?: () => void
  /** Rendu en tant que drawer mobile (pas de position fixed gérée ici) */
  variant?: "desktop" | "mobile"
}

export function Sidebar({ collapsed, onToggleCollapsed, onClose, variant = "desktop" }: SidebarProps) {
  const { resolvedTheme, toggleTheme } = useTheme()
  const isMobile = variant === "mobile"
  // Sur mobile le drawer est toujours en mode "expanded"
  const isCollapsed = isMobile ? false : collapsed

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-card transition-all duration-300 ease-in-out",
        // Desktop : fixed + largeur variable
        !isMobile && "fixed inset-y-0 left-0 z-30 shadow-sm",
        !isMobile && (isCollapsed ? "w-16" : "w-60"),
        // Mobile : pleine hauteur, largeur fixe (le parent gère le positionnement)
        isMobile && "w-72 h-full",
      )}
    >
      {/* Logo / titre */}
      <div
        className={cn(
          "flex h-14 items-center border-b shrink-0",
          isCollapsed ? "justify-center px-2" : "justify-between px-4",
        )}
      >
        {!isCollapsed && (
          <span className="bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-lg font-extrabold tracking-tight text-transparent">
            Bonap
          </span>
        )}
        {isCollapsed && (
          <UtensilsCrossed className="h-5 w-5 text-primary" />
        )}

        {/* Bouton fermer drawer (mobile) */}
        {isMobile && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Fermer le menu"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {/* Bouton collapse (desktop seulement) */}
        {!isMobile && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={cn(
              "rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              isCollapsed && "mx-auto",
            )}
            aria-label={isCollapsed ? "Déplier la sidebar" : "Replier la sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={isMobile ? onClose : undefined}
            className={({ isActive }) =>
              cn(
                "flex items-center rounded-lg transition-all duration-150",
                isCollapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2",
                "text-sm font-medium",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )
            }
            title={isCollapsed ? item.label : undefined}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Pied : lien Mealie + toggle thème */}
      <div className={cn("border-t px-2 py-3 space-y-1", isCollapsed && "flex flex-col items-center space-y-1")}>
        <a
          href={import.meta.env.VITE_MEALIE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            isCollapsed ? "p-2.5" : "w-full gap-3 px-3 py-2",
          )}
          title="Ouvrir Mealie"
        >
          <ExternalLink className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span>Mealie</span>}
        </a>

        <button
          type="button"
          onClick={toggleTheme}
          className={cn(
            "flex items-center rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            isCollapsed ? "p-2.5" : "w-full gap-3 px-3 py-2",
          )}
          aria-label={resolvedTheme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
          title={resolvedTheme === "dark" ? "Mode clair" : "Mode sombre"}
        >
          {resolvedTheme === "dark" ? (
            <Sun className="h-4 w-4 shrink-0" />
          ) : (
            <Moon className="h-4 w-4 shrink-0" />
          )}
          {!isCollapsed && (
            <span>{resolvedTheme === "dark" ? "Mode clair" : "Mode sombre"}</span>
          )}
        </button>
      </div>
    </aside>
  )
}
