import { Outlet, NavLink } from "react-router-dom"
import { CalendarDays, ShoppingCart, UtensilsCrossed, Sparkles, BarChart2, Settings } from "lucide-react"
import { Sidebar } from "./Sidebar.tsx"
import { AssistantDrawer } from "./AssistantDrawer.tsx"
import { useSidebar } from "../hooks/useSidebar.ts"
import { cn } from "../../lib/utils.ts"
import { llmConfigService } from "../../infrastructure/llm/LLMConfigService.ts"

const isAIEnabled = llmConfigService.isConfigured()

const mobileNavItems = [
  { to: "/planning", label: "Planning", icon: CalendarDays },
  { to: "/shopping", label: "Courses", icon: ShoppingCart },
  { to: "/recipes", label: "Recettes", icon: UtensilsCrossed },
  ...(isAIEnabled
    ? [{ to: "/suggestions", label: "Suggestions IA", icon: Sparkles }]
    : []),
  { to: "/stats", label: "Stats", icon: BarChart2 },
  { to: "/settings", label: "Settings", icon: Settings },
]

export function Layout() {
  const { collapsed, toggleCollapsed } = useSidebar()

  return (
    <div className="min-h-screen bg-background">
      {/* ── Sidebar desktop (hidden on mobile) ── */}
      <div className="hidden md:block">
        <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </div>

      {/* ── Contenu principal ── */}
      <main
        className={cn(
          "transition-[margin-left] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          /* Desktop : marge gauche selon état sidebar */
          "md:ml-[240px]",
          collapsed && "md:ml-[60px]",
          /* Mobile : plein écran */
          "ml-0",
          /* Padding contenu */
          "px-4 py-5 md:px-7 md:py-7",
          /* Extra espace bas pour nav mobile */
          "pb-24 md:pb-7",
        )}
      >
        <Outlet />
      </main>

      {/* ── Navigation basse mobile ── */}
      <nav
        className={cn(
          "fixed bottom-0 inset-x-0 z-50 md:hidden",
          "border-t border-border/40 bg-card/95 backdrop-blur-md",
          /* Ombre vers le haut */
          "shadow-[0_-1px_8px_oklch(0_0_0/0.06)]",
        )}
      >
        <div className="flex h-[58px] items-stretch">
          {mobileNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-[3px]",
                  "text-[9.5px] font-semibold tracking-[0.02em] uppercase",
                  "transition-colors duration-150",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground/60 hover:text-muted-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* Indicateur top */}
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-7 rounded-full bg-primary" />
                  )}
                  <item.icon
                    className={cn(
                      "h-[19px] w-[19px]",
                      "transition-transform duration-150",
                      isActive && "scale-110",
                    )}
                  />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <AssistantDrawer />
    </div>
  )
}
