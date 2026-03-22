import { Outlet } from "react-router-dom"
import { Menu } from "lucide-react"
import { Sidebar } from "./Sidebar.tsx"
import { AssistantDrawer } from "./AssistantDrawer.tsx"
import { useSidebar } from "../hooks/useSidebar.ts"
import { cn } from "../../lib/utils.ts"

export function Layout() {
  const { collapsed, toggleCollapsed, mobileOpen, openMobile, closeMobile } = useSidebar()

  return (
    <div className="min-h-screen bg-background">
      {/* ── Sidebar desktop (hidden on mobile) ── */}
      <div className="hidden md:block">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          variant="desktop"
        />
      </div>

      {/* ── Drawer mobile ── */}
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        onClick={closeMobile}
        aria-hidden="true"
      />
      {/* Drawer panel */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Sidebar
          collapsed={false}
          onToggleCollapsed={toggleCollapsed}
          onClose={closeMobile}
          variant="mobile"
        />
      </div>

      {/* ── Contenu principal ── */}
      <main
        className={cn(
          "transition-all duration-300 ease-in-out",
          // Desktop: left margin based on collapsed state
          "md:ml-60",
          collapsed && "md:ml-16",
          // Mobile: no margin
          "ml-0",
          "px-4 py-6 md:px-8 md:py-8",
        )}
      >
        {/* Mobile header with burger */}
        <div className="mb-6 flex items-center gap-3 md:hidden">
          <button
            type="button"
            onClick={openMobile}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-base font-extrabold tracking-tight">
              Bon<span className="text-primary">ap</span>
            </span>
          </div>
        </div>

        <Outlet />
      </main>

      <AssistantDrawer />
    </div>
  )
}
