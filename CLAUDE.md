# CLAUDE.md — Bonap

Mémoire projet pour Claude Code. Compressée depuis les 5 livrables `docs/` (MVP-SCOPE, PDL, SDLC, ROADMAP, MVP-EXEC). Mis à jour : 2026-08-10.

## 1. Projet

**Bonap** : front-end React pour [Mealie](https://mealie.io) (app self-hosted de recettes + planning repas). Remplace l'UI Mealie par une interface enrichie (suggestions IA, stats, liste de courses avec "Habituels", thème personnalisable).

**Env** (`.env`) : `VITE_MEALIE_URL` (URL instance Mealie), `VITE_MEALIE_TOKEN` (bearer API). Vite proxie `/api` → Mealie en dev. En prod, Mealie doit être accessible depuis le navigateur.

## 2. Stack

React 19 · TypeScript 5.9 strict · Vite 8 · Tailwind v4 (`@tailwindcss/vite`) · React Router v7 · shadcn/ui (Radix + Tailwind, composants dans `src/presentation/components/ui/`) · lucide-react · react-markdown · ESLint 9 + Prettier. **Pas de React Query/Zustand/Redux** — état via `useState`/`useCallback`/`useRef` dans hooks custom.

## 3. Architecture DDD

```
src/
├── domain/          # Métier pur. organizer/ (foods, units, categories, tags), planning/ (+ services/PlanningStatsService), recipe/, shopping/ (entities + repositories)
├── application/     # Use cases. Une classe par use case, injection de repo. <domaine>/usecases/<Verbe><Nom>UseCase.ts
├── infrastructure/  # container.ts (SINGLETON — toutes les instances repo + use case), llm/ (AssistantService streaming + tools, LLMService single-turn, LLMConfigService), mealie/api/ + mealie/repositories/, shopping/ (FoodLabelStore, RecipeSlugStore — localStorage), theme/ThemeService.ts
├── presentation/    # components/ (ui/ shadcn + Layout, Sidebar, AssistantDrawer, RecipeCard, RecipeDetailModal, RecipeFormDialog, RecipePickerDialog…), hooks/ (useRecipesInfinite, useRecipe, usePlanning, useShopping, useStats, useAssistant, useTheme…), pages/ (RecipesPage, PlanningPage, StatsPage, ShoppingPage, SuggestionsPage, SettingsPage…)
├── shared/types/    # mealie.ts, llm.ts, errors.ts (MealieApiError + 404/401/5xx spécialisés)
├── shared/utils/    # date.ts, duration.ts (ISO 8601 PT1H30M ↔ "1 h 30 min"), food.ts (extractFoodKey), season.ts (tags `saison-`)
└── lib/utils.ts     # cn() (clsx + tailwind-merge)
```

**Container pattern** : `src/infrastructure/container.ts` est le SEUL fichier qui instancie repos + use cases. Les hooks importent depuis ce fichier, jamais `new XxxRepository()` dans un hook/composant.

## 4. Domaines métier

### 4.1 Domaine `recipe`

**Entité principale** : `MealieRecipe` (dans `shared/types/mealie.ts`)
```typescript
{ id, slug, name, description?, image?, recipeCategory?, tags?, prepTime?, performTime?,
  recipeIngredient?, recipeInstructions?, extras? }
```

**Interface repository** (`IRecipeRepository`) :
- `getAll(page?, perPage?, filters?)` → `MealiePaginatedRecipes`
- `getBySlug(slug)` → `MealieRecipe`
- `create(name)` → `string` (retourne le slug)
- `update(slug, data: RecipeFormData)` → `MealieRecipe`
- `updateSeasons(slug, seasons)` → `MealieRecipe`
- `updateCategories(slug, categories)` → `MealieRecipe`
- `uploadImage(slug, file)` → `void`

**Use cases** :
- `GetRecipesUseCase.execute(page, perPage, filters)` — liste paginée avec filtres (search, categories, tags, maxTotalTime, seasons)
- `GetRecipeUseCase.execute(slug)` — détail
- `GetRecipesByIdsUseCase.execute(ids)` — plusieurs recettes par IDs (utile pour stats/shopping)
- `CreateRecipeUseCase.execute(data)` — crée + résout ingrédients + upload image
- `UpdateRecipeUseCase.execute(slug, data)` — même flux que create
- `UpdateSeasonsUseCase.execute(slug, seasons)` — met à jour les tags saison sans toucher les autres tags
- `UpdateCategoriesUseCase.execute(slug, categories)` — met à jour les catégories

**Particularité saisons** : les saisons sont stockées comme des **tags Mealie** avec le préfixe `saison-` (ex: `saison-ete`). Les filtres côté API Mealie ne supportent pas les saisons nativement, donc le filtrage saison se fait côté client via ces tags.

**Durées** : stockées en ISO 8601 (`PT30M`, `PT1H30M`) dans Mealie. Le formulaire accepte des minutes brutes (converti automatiquement). `formatDuration()` parse les deux formats.

**Portions (servings)** : Mealie expose **trois champs** sur la recette :
- `recipeServings: number` — nombre de portions (numérique, source de vérité écriture)
- `recipeYieldQuantity: number` — quantité de rendement (numérique, mirroir)
- `recipeYield: string` — libellé textuel ("portions", "personnes", "cookies"…)

À l'**écriture**, `RecipeRepository.update()` met le nombre saisi à la fois dans `recipeServings` ET `recipeYieldQuantity`, et garde `recipeYield` comme libellé texte (avec strip d'un préfixe numérique parasite éventuel).

À la **lecture**, utiliser `getRecipeServings(recipe)` (`shared/utils/servings.ts`) qui applique l'ordre de priorité : `recipeServings` > `recipeYieldQuantity` > `parseServings(recipeYield)`. **Ne pas appeler `parseServings(recipe.recipeYield)` directement** — c'est l'origine du bug de l'issue #14 (les valeurs Bonap-écrites n'étaient jamais relues).

Format planning : les portions par repas sont encodées en préfixe dans la note du mealplan via `[s:N]note utilisateur` (helpers `encodeServingsInText` / `decodeServingsFromText`). Le helper `getMealServings(meal)` retourne le nombre encodé sinon retombe sur la base de la recette.

### 4.2 Domaine `planning`

**Entité principale** : `MealieMealPlan`
```typescript
{ id: number, date: string, entryType: string, title?, recipeId?, recipe? }
```

**Interface repository** (`IPlanningRepository`) :
- `getWeekPlanning(startDate, endDate)` → `MealieMealPlan[]`
- `addMeal({ date, entryType, recipeId })` → `MealieMealPlan`
- `deleteMeal(id)` → `void`

**Use cases** :
- `GetWeekPlanningUseCase.execute(start, end)` — planning sur une plage
- `GetPlanningRangeUseCase.execute(start, end)` — idem (utilisé dans Stats + Suggestions)
- `AddMealUseCase.execute(date, entryType, recipeId)` — ajoute un repas
- `DeleteMealUseCase.execute(id)` — supprime
- `GetStatsUseCase` (fichier seul, contient `getPeriodDates`) — calcule les dates selon la période choisie (30d, 90d, 12m)

**Services domaine** (`PlanningStatsService`) :
- `computeLeftoverPercentage(mealPlans)` — % de repas "restes" (même recette sur 2 créneaux consécutifs)
- `computeStreak(mealPlans, start, end)` — semaines complètes consécutives
- `computeCategoryStats(recipes)` — distribution par catégorie

**Logique planning** : la page Planning affiche une fenêtre glissante de 3/5/7 jours avec prefetch ±14 jours en cache mémoire. `entryType` est "lunch" ou "dinner".

### 4.3 Domaine `shopping`

**Entités** (`domain/shopping/entities/ShoppingItem.ts`) :
```typescript
ShoppingItem { id, shoppingListId, checked, position, isFood, note?, quantity?, unitName?, foodName?, label?, display?, recipeNames?, source: "mealie" }
ShoppingList { id, name, labels: ShoppingLabel[] }
ShoppingLabel { id, name, color? }
```

**Interface repository** (`IShoppingRepository`) :
- `getOrCreateDefaultList()` → `ShoppingList` (liste "Bonap", auto-créée si absente)
- `getOrCreateHabituelsList()` → `ShoppingList` (liste "Habituels", auto-créée si absente)
- `getItems(listId)` → `{ items, labels }`
- `addItem(listId, data)` — ajout unitaire
- `addItems(listId, items)` — ajout en masse (bulk)
- `updateItem(listId, item)` → `ShoppingItem`
- `deleteItem(listId, itemId)` — suppression d'un item
- `deleteCheckedItems(listId, items)` — vide les cochés
- `deleteAllItems(listId, items)` — vide tout

**Use cases** :
- `GetShoppingItemsUseCase.execute()` — charge les deux listes (Bonap + Habituels) en parallèle
- `AddItemUseCase.execute(listId, note, quantity, labelId?)` — ajoute un item
- `AddRecipesToListUseCase.execute(listId, entries)` — ajoute les ingrédients de plusieurs recettes ; chaque entry accepte un `servingsRatio` qui multiplie les quantités (scaling)
- `ToggleItemUseCase.execute(listId, item)` — coche/décoche
- `DeleteItemUseCase.execute(listId, itemId)` — supprime
- `ClearListUseCase.execute(listId, items, mode)` — mode: "checked" | "all"

**FoodLabelStore** : persistance localStorage (`bonap:food_labels`) — mémorise food_key → labelId pour pré-assigner automatiquement les labels lors des prochains ajouts.

**extractFoodKey** : normalise un nom d'aliment (minuscules, strip unités) pour déduplication et matching.

### 4.4 Domaine `organizer`

Référentiels Mealie (aliments, unités, catégories, tags) :
- `GetFoodsUseCase.execute()` → `MealieFood[]`
- `CreateFoodUseCase.execute(name)` → `MealieFood` (crée si absent)
- `GetUnitsUseCase.execute()` → `MealieUnit[]`
- `GetCategoriesUseCase.execute()` → `MealieCategory[]`
- `GetTagsUseCase.execute()` → `MealieTag[]`

**resolveIngredients** (`application/recipe/usecases/resolveIngredients.ts`) : fonction clé qui, lors de la sauvegarde d'une recette, résout chaque ingrédient du formulaire (nom → id Mealie), en créant l'aliment s'il n'existe pas. Les unités ne sont PAS créées automatiquement (lookup uniquement).

---

## 5. Infrastructure / API Mealie

### 5.1 Client HTTP

`MealieApiClient` — singleton `mealieApiClient` (exporté depuis `src/infrastructure/mealie/api/index.ts`).

## 5. API Mealie (`MealieApiClient`, singleton `mealieApiClient`)

Auth `Authorization: Bearer <VITE_MEALIE_TOKEN>`. Erreurs 401/404/5xx mappées. Endpoints :

| Méthode | Endpoint | Usage |
|---------|----------|-------|
| GET | `/api/recipes?page=&perPage=&search=&categories=&tags=&maxTotalTime=` | Liste recettes paginée |
| GET | `/api/recipes/:slug` | Détail recette |
| POST | `/api/recipes` `{ name }` | Création recette (retourne slug ou `{ slug }`) |
| PATCH | `/api/recipes/:slug` | Mise à jour recette (name, description, prepTime, performTime, recipeCategory, recipeIngredient, recipeInstructions, tags) |
| PUT | `/api/recipes/:slug/image` (multipart) | Upload image recette |
| GET | `/api/households/mealplans?page=1&perPage=-1&start_date=&end_date=` | Planning sur une plage |
| POST | `/api/households/mealplans` `{ date, entryType, recipeId }` | Ajout repas |
| DELETE | `/api/households/mealplans/:id` | Suppression repas |
| GET | `/api/households/shopping/lists?page=1&perPage=-1` | Liste des listes de courses |
| POST | `/api/households/shopping/lists` `{ name }` | Création liste |
| GET | `/api/households/shopping/lists/:id` | Items + labels d'une liste |
| POST | `/api/households/shopping/items/create-bulk` `[{ shoppingListId, note, isFood, quantity, ... }]` | Ajout items en masse |
| PUT | `/api/households/shopping/items` `[{ id, shoppingListId, checked, ... }]` | Mise à jour item(s) |
| DELETE | `/api/households/shopping/items?ids=&ids=...&` | Suppression items (multi-IDs via query string, noter le `&` final) |
| GET | `/api/organizers/categories` | Liste catégories |
| GET | `/api/organizers/tags` | Liste tags |
| GET | `/api/foods?page=1&perPage=-1&orderBy=name&orderDirection=asc` | Liste aliments |
| POST | `/api/foods` `{ id: "", name, description: "" }` | Création aliment |
| GET | `/api/units` | Liste unités |
| GET | `/api/media/recipes/:id/images/min-original.webp` | Image recette (proxié via `/api`) |

### 5.3 Particularités API Mealie

- **Pagination** : l'API retourne `per_page` / `total_pages` (snake_case) ; le repo normalise en camelCase.
- **`perPage=-1`** : récupère tout en une requête (utilisé pour les référentiels).
- **Tags saison** : préfixe `saison-` (ex: `saison-hiver`). `resolveSeasonTags()` résout les IDs existants avant PATCH.
- **Création recette** : POST `/api/recipes` retourne parfois un string (slug) parfois `{ slug }` — le repo gère les deux cas.
- **DELETE shopping items** : endpoint `?ids=xxx&ids=yyy&` avec un `&` final obligatoire (quirk Mealie).
- **updateItem shopping** : PUT retourne `MealieShoppingItem[] | null` — fallback si null.
- **Proxy LLM en dev** : Vite proxie aussi `/anthropic`, `/openai`, `/google-ai` vers les APIs respectives (contournement CORS).

---

## 6. Pages et routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | → redirect `/recipes` | |
| `/recipes` | `RecipesPage` | Grille de recettes avec filtres (search, catégories, tags, durée, saisons), scroll infini |
| `/recipes/new` | `RecipeFormPage` | Formulaire création recette |
| `/recipes/:slug/edit` | `RecipeFormPage` | Formulaire édition recette |
| `/recipes/:slug` | `RecipeDetailPage` | Détail recette (ingrédients, instructions, saisons, catégories) |
| `/planning` | `PlanningPage` | Calendrier planning (3/5/7 jours, navigation, ajout/suppression repas) |
| `/stats` | `StatsPage` | Statistiques (30j/90j/12m) : top recettes, top ingrédients, streak, restes, couverture catalogue |
| `/shopping` | `ShoppingPage` | Liste de courses "Bonap" + liste "Habituels" |
| `/suggestions` | `SuggestionsPage` | Suggestions IA (critères prédéfinis + texte libre → 5 suggestions via LLM) |
| `/settings` | `SettingsPage` | Config LLM (Anthropic/OpenAI/Google/Ollama), thème, couleur d'accent |
| `/kiosk` | `KioskPage` (`orientation="horizontal"`) | Affichage tablette plein écran — un jour par colonne, scroll horizontal |
| `/kiosk-vertical` | `KioskPage` (`orientation="vertical"`) | Même page en portrait — un jour par ligne, repas en colonnes, tout tient à l'écran |

**Mode kiosk** : hors `Layout` (pas de sidebar), auto-refresh toutes les 5 min, horloge mise à jour chaque minute. Le nombre de jours affichés (`kioskDays`, 3/5/7) vient de `usePlanningPreferences` (localStorage `bonap_kiosk_prefs`, réglable dans Settings). Un bouton dans le header bascule entre les deux orientations (`navigate(..., { replace: true })` pour que le retour arrière ramène au planning). Le root est en `h-screen` (pas `min-h-screen`) : c'est ce qui permet aux `h-full` / `flex-1` internes de se résoudre et évite le scroll de page en vertical.
| `/settings` | `SettingsPage` | Config LLM (Anthropic/OpenAI/Google/Mistral/Perplexity/OpenRouter/OpenCode Zen/OpenCode Go/Ollama), thème, couleur d'accent |

**Layout** : `Layout.tsx` wrap toutes les routes. Il contient `Sidebar` + `AssistantDrawer` (bouton flottant Sparkles en bas à droite).

---

## 7. Composants importants

### Composants partagés

- **`RecipeFormDialog`** : formulaire complet (nom, description, prepTime/performTime en minutes, ingrédients avec autocomplete food+unit, instructions, saisons, catégories/tags). Utilisé dans RecipeFormPage.
- **`RecipePickerDialog`** : recherche + sélection de recette. Utilisé dans PlanningPage pour choisir une recette à ajouter au planning.
- **`AssistantDrawer`** : drawer flottant avec chat IA. Outils disponibles : `search_recipe`, `add_to_planning`, `create_recipe`. Streaming Anthropic uniquement (les autres providers ont un fallback non-streaming sans tools).
- **`Autocomplete`** (`ui/autocomplete.tsx`) : input avec suggestions dropdown, rendu via portail pour éviter les problèmes de z-index dans les modals.

### Hooks custom (tous dans `src/presentation/hooks/`)

| Hook | Usage |
|------|-------|
| `useRecipesInfinite(filters)` | Scroll infini (50/page), reset auto sur changement de filtres |
| `useRecipe(slug)` | Chargement + mutations d'une recette |
| `useRecipeForm(recipe?)` | Logique du formulaire recette |
| `usePlanning()` | Planning avec cache ±14j, prefetch, add/delete |
| `useShopping()` | Liste complète Bonap + Habituels, toutes les mutations |
| `useStats()` | Stats avec sélecteur de période |
| `useCategories()` | Liste catégories (1 appel) |
| `useTags()` | Liste tags |
| `useFoods()` | Liste aliments |
| `useUnits()` | Liste unités |
| `useUpdateSeasons(slug)` | Mutation saisons recette |
| `useUpdateCategories(slug)` | Mutation catégories recette |
| `useAddRecipesToCart()` | Ajoute ingrédients d'une recette à la liste d'achat |
| `useCategorizeItems(items, labels)` | Regroupe les items par label pour affichage |
| `useAssistant()` | Chat assistant avec historique, tools, streaming |
| `useTheme()` | Thème + couleur d'accent avec ThemeService |
| `useSidebar()` | État ouvert/fermé sidebar (mobile) |

---

## 8. Patterns et conventions

### Créer un nouveau use case

1. Créer `src/application/<domaine>/usecases/MonUseCase.ts`
2. Pattern classe avec injection de dépendances :
```typescript
export class MonUseCase {
  constructor(private repo: IMonRepository) {}
  async execute(param: string): Promise<ResultType> {
    return this.repo.doSomething(param)
  }
}
```
3. Ajouter l'instance singleton dans `src/infrastructure/container.ts`
4. Créer le hook correspondant dans `src/presentation/hooks/useMonFeature.ts`
5. Le hook importe depuis `container.ts`, jamais depuis le repo directement

### Créer un nouveau composant

- Fichier dans `src/presentation/components/` ou `pages/`
- Toujours TypeScript strict, pas de `any`
- Classes Tailwind directement (pas de fichiers CSS séparés)
- Classes Radix via shadcn/ui pour dialog, badge, button, input, label
- `cn()` de `src/lib/utils.ts` pour les classes conditionnelles

### Convention de nommage

- Fichiers : PascalCase pour composants/classes, camelCase pour utils/hooks
- Use cases : `<Verbe><Nom>UseCase.ts`
- Repositories : `I<Nom>Repository.ts` (interface), `<Nom>Repository.ts` (implémentation)
- Hooks : `use<Nom>.ts` (camelCase, toujours avec `use` prefix)
- Exports : named exports partout, pas de default sauf `App.tsx` et `main.tsx`

### Gestion d'état

- Pas de store global (pas de Redux/Zustand)
- **useState + useCallback** dans les hooks custom pour l'état local + mutations
- **Optimistic updates** : pattern utilisé dans `useShopping` (ex: `toggleItem` — flip immédiat, rollback si erreur)
- Pas de React Query — les hooks gèrent manuellement le chargement/erreur/data

### Container pattern

`src/infrastructure/container.ts` est le seul fichier qui instancie les repos et use cases. Les hooks importent les instances depuis ce fichier. Jamais `new RecipeRepository()` dans un composant ou hook.

## 6. LLM / Assistant

Deux modes : `llmChat` (single-turn, SuggestionsPage) et `sendAssistantMessage` (streaming multi-turn + tools, AssistantDrawer). Providers : **Anthropic** (seul avec streaming + tool use), OpenAI/Google/Mistral/Perplexity/OpenRouter/OpenCode Zen/OpenCode Go (fallback single-turn sans tools), Ollama (local). Config dans localStorage `bonap_llm_config`. Tools : `search_recipe`, `add_to_planning`, `create_recipe` (synchro entre `AssistantService.ts` et `useAssistant.ts`). Proxy Vite dev : `/anthropic`, `/openai`, `/google-ai`, `/api/opencode`, `/api/opencode-go`.

## 7. Pages / routes

`/` → `/recipes` · `/recipes` · `/recipes/new` · `/recipes/:slug` · `/recipes/:slug/edit` · `/planning` (fenêtre 3/5/7j, cache ±14j) · `/stats` (30j/90j/12m) · `/shopping` (Bonap + Habituels) · `/suggestions` (IA) · `/settings` (LLM + thème). `Layout.tsx` wrap tout : Sidebar + AssistantDrawer (bouton flottant Sparkles).

## 8. Patterns / conventions

- **Nouveau use case** : classe + injection repo → instance dans `container.ts` → hook `use<Nom>.ts` qui importe depuis container → page. Jamais de `new XxxRepository()` hors container.
- **Nouveau composant** : TypeScript strict (pas de `any`), classes Tailwind directes, shadcn/ui pour dialog/badge/button/input/label, `cn()` pour classes conditionnelles.
- **Nommage** : PascalCase composants/classes, camelCase utils/hooks. Use cases `<Verbe><Nom>UseCase.ts`. Hooks `use<Nom>.ts` (préfixe `use` obligatoire). Named exports partout (sauf `App.tsx`/`main.tsx`).
- **État** : `useState`/`useCallback` + optimistic updates (pattern `useShopping.toggleItem` — flip immédiat, rollback si erreur). Pas de store global.
- **Scroll infini** : `useRecipesInfinite` avec `loadingRef` (anti double-fetch) + `filtersKey` sérialisé (arrays triés) pour reset stable.

## 9. Thème

light/dark/system (localStorage `bonap_theme`) + 8 couleurs d'accent oklch (localStorage `bonap_accent`, CSS var `--color-primary`). Singleton `themeService` appliqué dans `main.tsx`.

## 10. Commandes

```bash
npm run dev      # Vite dev server (5173), proxy Mealie + LLM actif
npm run build    # tsc -b && vite build → dist/
npm run lint     # ESLint
npm run preview  # Prévisualisation prod
```

## 11. Pièges critiques

- **DELETE shopping items** : query string doit finir par `&` (`?ids=abc&ids=def&`) — sinon Mealie ignore.
- **POST `/api/recipes`** : retourne `"slug"` (string) OU `{ slug }` selon version — le repo gère les deux.
- **Saisons** : Mealie ne connaît pas les saisons nativement. Tags préfixe `saison-` (ex: `saison-ete`). Résoudre les IDs via GET `/api/organizers/tags` avant PATCH.
- **`perPage=-1`** : OK pour référentiels (foods, units, categories, tags). **Pas pour recettes** (potentiellement des milliers).
- **updateItem shopping** : PUT peut retourner `null` (certaines versions Mealie) — fallback sur données envoyées.
- **Durées** : formulaire en minutes integer, API en ISO 8601 (`PT30M`). Conversion dans `RecipeRepository.minutesToIso()`. `formatDuration()` accepte les deux formats.
- **resolveIngredients** : 2 appels API (foods + units) à chaque create/update. Aliments créés auto, unités non créées (unitId reste undefined → texte libre).
- **Anthropic-only streaming + tool use** : les 8 autres providers ont fallback single-turn sans tools — documenté dans Settings.
- **OpenCode Go/Zen** : pas de CORS header → proxy Vite/nginx (`/api/opencode-go`, `/api/opencode`), comme Ollama.

### Shopping
- L'ajout d'un item existant (même `foodKey`) **incrémente la quantité** plutôt que de dupliquer
- La liste "Bonap" et "Habituels" sont auto-créées dans Mealie si elles n'existent pas
- **Habituels** : créés avec `isFood: true` et un `foodId` résolu (création à la volée si l'aliment n'existe pas dans Mealie). Évite l'enregistrement en simple texte (note) qui empêchait le typage.

### Portions / scaling
- **Lecture** : toujours `getRecipeServings(recipe)`, jamais `parseServings(recipe.recipeYield)` — voir `shared/utils/servings.ts`. Le bug #14 venait précisément de cette confusion.
- **Scaling à l'ajout au panier** : `AddRecipesToListUseCase` multiplie `quantity` par `servingsRatio` quand l'ingrédient a `quantity > 0` ET au moins l'un de `unit` ou `food` (sinon impossible à formater proprement). Output : `"500 g farine"`, `"2 oignon"`, ou fallback texte brut. Évite les artefacts type `3 1 cup farine` car ce cas (quantité dans la note libre, pas dans `quantity`) tombe en fallback.
- **`InlineEditServings`** (dans `RecipeEditorShared.tsx`) : composant +/- avec affichage du facteur d'échelle (`2×`, `1.5×`) — utilisé sur la fiche recette en édition.
- **MealCell** : sélecteur +/- par repas dans le planning. Le delta est encodé via `[s:N]` dans la note du mealplan, ce qui évite de modifier la recette de base.

- **v1.0** : en prod (v1.3.5 courant). Maintenance corrective en parallèle.
- **v1.1** (cible 2027-01-15, ~44h) : PWA/offline, import URL, export PDF, i18n EN/FR, accessibilité WCAG AA, tests E2E couvrant v1.0 (anti-régression avant v2.0). Sprints S0–S6 dans `docs/MVP-EXEC.md`.
- **v2.0** (cible 2027-06-30, ~52h) : planning auto IA, nutrition (OpenFoodFacts), multi-households, partage public de recettes, cookbook. Feature flags `multiHouseholdsEnabled`/`nutritionEnabled`/`cookbooksEnabled`. Sprints S7–S11 dans `docs/MVP-EXEC.md`.
- **Skills à créer** (via skill-creator, sprint S0) : `scaffold-ddd-feature`, `e2e-test-gen`, `i18n-extract`, `accessibility-audit`, `performance-audit`, `recipe-migration` (optionnel). Voir `docs/PDL.md` §11 et `docs/MVP-EXEC.md` Sprint S0.
- **MCP** : Playwright, Context7, GitHub, Filesystem, Sequential Thinking (install Sprint S0 / T6). Custom `bonap-nutrition`, `bonap-pdf` envisagés en v2.0.

## 13. Références livrables

`docs/MVP-SCOPE.md` (cadrage produit) · `docs/PDL.md` (architecture DDD + modules + séquencement) · `docs/SDLC.md` (méthodologie Kanban-solo, DoR/DoD, CI/CD) · `docs/ROADMAP.md` (v1.1/v2.0 jalons + risques) · `docs/MVP-EXEC.md` (sprints S0–S11 + tickets). Présupposition d'exécution : **solo + Claude Code + sous-agents IA spécialisés créés via skill-creator en local** — pas d'équipe humaine.