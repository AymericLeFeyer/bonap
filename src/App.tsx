import { Routes, Route, Navigate } from "react-router-dom"
import { Layout } from "./presentation/components/Layout.tsx"
import { RecipesPage } from "./presentation/pages/RecipesPage.tsx"
import { RecipeDetailPage } from "./presentation/pages/RecipeDetailPage.tsx"
import { RecipeFormPage } from "./presentation/pages/RecipeFormPage.tsx"
import { PlanningPage } from "./presentation/pages/PlanningPage.tsx"
import { StatsPage } from "./presentation/pages/StatsPage.tsx"
import { ShoppingPage } from "./presentation/pages/ShoppingPage.tsx"
import { SettingsPage } from "./presentation/pages/SettingsPage.tsx"
import { SuggestionsPage } from "./presentation/pages/SuggestionsPage.tsx"

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/recipes" replace />} />
        <Route path="recipes" element={<RecipesPage />} />
        <Route path="recipes/new" element={<RecipeFormPage />} />
        <Route path="recipes/:slug/edit" element={<RecipeFormPage />} />
        <Route path="recipes/:slug" element={<RecipeDetailPage />} />
        <Route path="planning" element={<PlanningPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="shopping" element={<ShoppingPage />} />
        <Route path="suggestions" element={<SuggestionsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}

export default App
