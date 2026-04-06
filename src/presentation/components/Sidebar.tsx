import { NavLink } from "react-router-dom"
import { UtensilsCrossed, CalendarDays, BarChart2, ShoppingCart, ExternalLink, Settings, Sparkles } from "lucide-react"
import { cn } from "../../lib/utils.ts"
import { getEnv, getIngressBasename } from "../../shared/utils/env.ts"
import { llmConfigService } from "../../infrastructure/llm/LLMConfigService.ts"

const isAIEnabled = llmConfigService.isConfigured()

const navItems = [
  { to: "/planning", label: "Planning", icon: CalendarDays },
  { to: "/shopping", label: "Courses", icon: ShoppingCart },
  { to: "/recipes", label: "Recettes", icon: UtensilsCrossed },
  ...(isAIEnabled
    ? [{ to: "/suggestions", label: "Suggestions IA", icon: Sparkles }]
    : []),
  { to: "/stats", label: "Statistiques", icon: BarChart2 },
]

interface SidebarProps {
  collapsed: boolean
  onToggleCollapsed: () => void
}

export function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col",
        "border-r border-border/40 bg-card",
        "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        collapsed ? "w-[60px]" : "w-[240px]",
        /* Ombre très douce sur le côté droit */
        "shadow-[2px_0_12px_oklch(0_0_0/0.04)]",
      )}
    >
      {/* ── Logo ── */}
      <div
        className={cn(
          "flex h-[60px] shrink-0 items-center border-b border-border/40",
          collapsed ? "justify-center px-3" : "justify-between px-4",
        )}
      >
        {!collapsed ? (
            <img src={`${getIngressBasename()}/logo_bonap.png`} onClick={onToggleCollapsed} alt="bonap" className="h-9 object-contain" />
        ) : (
          <img src={`${getIngressBasename()}/bonap.png`} onClick={onToggleCollapsed} alt="bonap" className="h-8 w-8 object-contain" />
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 scrollbar-hide">
        {!collapsed && (
          <p className="mb-2 px-2.5 text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground/40">
            Navigation
          </p>
        )}

        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "relative flex items-center rounded-[var(--radius-lg)] text-sm transition-all duration-150",
                collapsed ? "justify-center p-2.5" : "gap-3 px-2.5 py-2",
                isActive
                  ? "bg-primary/8 text-primary font-semibold"
                  : "text-muted-foreground font-medium hover:bg-secondary hover:text-foreground",
              )
            }
            title={collapsed ? item.label : undefined}
          >
            {({ isActive }) => (
              <>
                {/* Indicateur actif — pill gauche */}
                {isActive && !collapsed && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-[18px] w-[3px] rounded-r-full bg-primary" />
                )}
                <item.icon
                  className={cn(
                    "h-[17px] w-[17px] shrink-0",
                    isActive ? "text-primary" : "text-muted-foreground/70",
                    "transition-transform duration-150",
                    isActive && "scale-110",
                  )}
                />
                {!collapsed && (
                  <span className="text-[13.5px] leading-none">{item.label}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Séparateur ── */}
      <div className="mx-3 h-px bg-border/40" />

      {/* ── Footer ── */}
      <div className="px-2 py-3 space-y-0.5">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              "flex items-center rounded-[var(--radius-lg)] text-[13.5px] font-medium transition-colors",
              collapsed ? "justify-center p-2.5 w-full" : "gap-3 px-2.5 py-2 w-full",
              isActive
                ? "bg-primary/8 text-primary font-semibold"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )
          }
          title={collapsed ? "Paramètres" : undefined}
        >
          <Settings className="h-[17px] w-[17px] shrink-0" />
          {!collapsed && <span>Paramètres</span>}
        </NavLink>

        <a
          href={getEnv("VITE_MEALIE_URL")}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center rounded-[var(--radius-lg)] text-[13.5px] font-medium",
            "text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
            collapsed ? "justify-center p-2.5 w-full" : "gap-3 px-2.5 py-2 w-full",
          )}
          title="Ouvrir Mealie"
        >
          <ExternalLink className="h-[17px] w-[17px] shrink-0" />
          {!collapsed && <span>Mealie</span>}
        </a>
      </div>
    </aside>
  )
}
