import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Layout } from './presentation/components/Layout.tsx'
import { AuthPage } from './presentation/pages/authPage.tsx'
import { RecipesPage } from './presentation/pages/RecipesPage.tsx'
import { RecipeDetailPage } from './presentation/pages/RecipeDetailPage.tsx'
import { RecipeFormPage } from './presentation/pages/RecipeFormPage.tsx'
import { PlanningPage } from './presentation/pages/PlanningPage.tsx'
import { StatsPage } from './presentation/pages/StatsPage.tsx'
import { ShoppingPage } from './presentation/pages/ShoppingPage.tsx'
import { SettingsPage } from './presentation/pages/SettingsPage.tsx'
import { SuggestionsPage } from './presentation/pages/SuggestionsPage.tsx'
import { ExploreRecipesPage } from './presentation/pages/ExploreRecipesPage.tsx'
import { NutritionMappingPage } from './presentation/pages/NutritionMappingPage.tsx'

const STORAGE_KEYS = {
  MEALIE_URL: 'bonap-mealie-url',
  MEALIE_TOKEN: 'bonap-mealie-token',
}

const isProtectedRoute = import.meta.env.VITE_PROTECTED_ROUTE === 'true'

function ProtectedRoute() {
  const token = localStorage.getItem(STORAGE_KEYS.MEALIE_TOKEN)
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}

function App() {
  return (
    <Routes>
      {isProtectedRoute && <Route path="login" element={<AuthPage />} />}
      <Route element={isProtectedRoute ? <ProtectedRoute /> : <Outlet />}>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/recipes" replace />} />
          <Route path="recipes" element={<RecipesPage />} />
          <Route path="recipes/new" element={<RecipeFormPage />} />
          <Route path="recipes/:slug" element={<RecipeDetailPage />} />
          <Route path="recipes/:slug/nutrition" element={<NutritionMappingPage />} />
          <Route path="planning" element={<PlanningPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="shopping" element={<ShoppingPage />} />
          <Route path="suggestions" element={<SuggestionsPage />} />
          <Route path="explore" element={<ExploreRecipesPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
