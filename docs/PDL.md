# PDL — Plan de Développement Logiciel — Bonap

> Document généré le 2026-08-10 par l'agent `pdl-creator` (étape 2/6 du pipeline orchestrateur-dev).
> Input : `docs/MVP-SCOPE.md` + état courant du dépôt (v1.3.5, v1.0 livrée).
> Présupposition d'exécution : solo + Claude Code + sous-agents IA spécialisés créés via skill-creator en local. Pas d'équipe humaine.

---

## 1. Vision technique

Bonap est un **front-end React 19 monolithique** se branchant sur une instance **Mealie self-hosted** (backend imposé). L'architecture suit le **Domain-Driven Design (DDD)** en 5 couches : `domain`, `application`, `infrastructure`, `presentation`, `shared`. Le state est géré par **hooks custom (useState/useCallback/useRef)** — pas de Redux, Zustand, ou React Query. L'injection de dépendances passe par un **container singleton** (`infrastructure/container.ts`) instanciant repos + use cases une seule fois.

Le projet est déjà livré en v1.0 (12 fonctionnalités Must-have, v1.3.5 en cours). Ce PDL documente l'architecture actuelle et prépare les extensions v1.1 (PWA, import URL, export PDF, i18n, accessibilité, tests E2E) et v2.0 (planning auto IA, nutrition, multi-households, partage public, cookbook) sans casser les fondations DDD existantes.

**Principes directeurs** :
- DDD strict : la couche `presentation` ne connaît jamais `infrastructure` directement — elle passe par les `application/usecases` qui consomment des interfaces `domain/repositories`.
- TypeScript strict partout, pas de `any`, exports nommés (sauf `App.tsx` et `main.tsx`).
- Optimistic updates pour les mutations UI sensibles (pattern `useShopping`).
- Compatibilité API Mealie : absorber les quirks côté `infrastructure/mealie/` pour ne jamais les laisser fuir vers `application` ou `presentation`.

---

## 2. Architecture technique

### 2.1 Stack globale

| Couches | Technologie | Version | Rôle |
|---|---|---|---|
| Framework UI | React | 19.2 | Rendu SPA |
| Langage | TypeScript | ~6.0 strict | Typage statique |
| Build | Vite | 8 | Dev server + bundler |
| Styles | Tailwind CSS | v4 (`@tailwindcss/vite`) | Classes atomiques, oklch |
| Routing | React Router | v7 (sans file-based) | Routes client |
| Design system | shadcn/ui (Radix UI + Tailwind) | Radix UI | Composants accessibles |
| Icons | `lucide-react` | 1.14 | Icônes |
| Markdown | `react-markdown` + `rehype-raw` | 10 | Rendu instructions recette |
| Lint | ESLint 9 + Prettier | 9 / 3.8 | Qualité code |
| Test unitaires | Vitest 4 + Testing Library | 4 / 16 | Tests hooks et composants |
| Test E2E | Playwright | 1.59 | Parcours critiques |
| Legacy browser | `@vitejs/plugin-legacy` | 8 | Transpile pour navigateurs anciens |

### 2.2 State management

- **Pas de store global**. Pas de Redux, Zustand, Jotai, React Query.
- État local composant : `useState` + `useReducer` (rare).
- État partagé entre hooks : **container singleton** + **localStorage** pour la persistance config (LLM, thème, accent, food_labels).
- Optimistic updates : pattern documenté dans `useShopping` (`toggleItem` flip immédiat, rollback si erreur).
- Cache mémoire : `usePlanning` maintient `fetchedRange` en `useRef` (étendu, jamais remplacé) ; `useRecipesInfinite` utilise `loadingRef` contre le double-fetch.

### 2.3 Schéma DDD en 5 couches

```
src/
├── domain/             # Logique métier pure, zéro dépendance externe
│   ├── organizer/      # Référentiels (foods, units, categories, tags)
│   ├── planning/        # Planning + services de stats (PlanningStatsService)
│   ├── recipe/          # Recettes
│   └── shopping/        # Entités shopping + interfaces repo
├── application/        # Use cases — orchestre domain + infra
│   ├── organizer/
│   ├── planning/
│   ├── recipe/
│   └── shopping/
├── infrastructure/     # Implémentations concrètes (Mealie, LLM, storage, theme)
│   ├── container.ts    # SINGLETON — instancie tous les repos + use cases
│   ├── llm/            # AssistantService (streaming+tools), LLMService (single-turn), LLMConfigService
│   ├── mealie/         # api/ (client HTTP), repositories/ (implémente les interfaces domain)
│   ├── shopping/       # FoodLabelStore, RecipeSlugStore (localStorage)
│   └── theme/          # ThemeService (light/dark/system + accent oklch)
├── presentation/       # UI
│   ├── components/      # Composants partagés (Layout, Sidebar, AssistantDrawer, modals, etc.)
│   ├── components/ui/   # shadcn/ui (button, badge, card, dialog, input, label, autocomplete)
│   ├── hooks/          # Hooks custom (consomme use cases via container)
│   └── pages/          # Pages React Router
├── shared/
│   ├── types/          # mealie.ts, llm.ts, errors.ts
│   └── utils/          # date, duration, food, season
├── lib/utils.ts        # cn() (clsx + tailwind-merge)
├── App.tsx             # Routes
└── main.tsx            # Entry point (BrowserRouter, themeService.apply())
```

**Règle de flux** :
`presentation/hooks` → `application/usecases` (via `container.ts`) → `domain/repositories` (interface) → `infrastructure/mealie/repositories` (implémentation) → `infrastructure/mealie/api/MealieApiClient`.

**Règle d'or** : un hook n'importe jamais un `infrastructure` directement. Il importe un use case instancié dans `container.ts`. Le `container.ts` est le **seul** fichier autorisé à `new RecipeRepository()`, `new GetRecipesUseCase()`, etc.

### 2.4 Container pattern

`src/infrastructure/container.ts` instancie, à l'import, tous les singletons :

```typescript
// Repos (infrastructure)
const recipeRepository = new RecipeRepository(mealieApiClient);
const planningRepository = new PlanningRepository(mealieApiClient);
const shoppingRepository = new ShoppingRepository(mealieApiClient);
const categoryRepository = new CategoryRepository(mealieApiClient);
// ... + tag, food, unit

// Use cases (application)
export const getRecipesUseCase = new GetRecipesUseCase(recipeRepository);
export const getRecipeUseCase = new GetRecipeUseCase(recipeRepository);
export const createRecipeUseCase = new CreateRecipeUseCase(recipeRepository, foodRepository);
// ...
```

Les hooks importent `getRecipesUseCase` depuis `container.ts` — jamais de `new` dans un hook.

### 2.5 Multi-provider LLM

Deux services distincts dans `infrastructure/llm/` :

- **`LLMService`** (`single-turn`) : un system + un user → un text. Utilisé par `SuggestionsPage`. Supporte tous les providers via un dispatch `provider → fetchHelper`.
- **`AssistantService`** (`multi-turn streaming + tool use`) : utilisé par `AssistantDrawer`. **Anthropic uniquement** pour le streaming + tool use ; fallback non-streaming sans tools pour les autres providers.

Providers supportés (9 au total) :
| Provider | Streaming | Tool use | Endpoint | Proxy dev Vite |
|---|---|---|---|---|
| `anthropic` | Oui | Oui | `https://api.anthropic.com/v1/messages` | `/anthropic` |
| `openai` | Non | Non | `https://api.openai.com/v1/chat/completions` | `/openai` |
| `google` | Non | Non | `https://generativelanguage.googleapis.com/...` | `/google-ai` |
| `mistral` | Non | Non | `https://api.mistral.ai/v1/chat/completions` | (direct) |
| `perplexity` | Non | Non | `https://api.perplexity.ai/chat/completions` | (direct) |
| `openrouter` | Non | Non | `https://openrouter.ai/api/v1/chat/completions` | (direct) |
| `opencode` (Zen) | Non | Non | `https://opencode.ai/zen/v1/chat/completions` | `/api/opencode` |
| `opencode-go` | Non | Non | `https://opencode.ai/zen/go/v1/chat/completions` | `/api/opencode-go` |
| `ollama` | Non | Non | `http://localhost:11434/api/chat` | (direct local) |

Config persistée dans `localStorage["bonap_llm_config"]` via `LLMConfigService`.

### 2.6 Thème / design

- Mode `light` / `dark` / `system` — persisté dans `bonap_theme`.
- Couleur d'accent : 8 presets oklch — persistée dans `bonap_accent`, appliquée via `--color-primary`.
- `ThemeService` (singleton) — appliqué au boot dans `main.tsx` et réactif via `useTheme`.

---

## 3. Modules et dépendances entre composants

### 3.1 Graphe de dépendances inter-couches

```
presentation/pages
  └─> presentation/hooks
        └─> application/usecases  (via container.ts)
              └─> domain/repositories (interfaces)
                    ▲
                    │ (implémente)
              infrastructure/mealie/repositories
                    └─> infrastructure/mealie/api/MealieApiClient
                          └─> shared/types/mealie.ts, shared/types/errors.ts

infrastructure/llm/AssistantService
  └─> application/usecases (pour tool use : search_recipe, add_to_planning, create_recipe)
  └─> shared/types/llm.ts

infrastructure/shopping/FoodLabelStore
  └─> shared/utils/food.ts (extractFoodKey)
```

### 3.2 Modules fonctionnels (domaines)

| Domaine | Entité principale | Repositories | Use cases | Hooks | Pages |
|---|---|---|---|---|---|
| `recipe` | MealieRecipe | IRecipeRepository | GetRecipes, GetRecipe, GetRecipesByIds, CreateRecipe, UpdateRecipe, UpdateSeasons, UpdateCategories + `resolveIngredients` | useRecipesInfinite, useRecipe, useRecipeForm, useUpdateSeasons, useUpdateCategories, useAddRecipesToCart | /recipes, /recipes/new, /recipes/:slug, /recipes/:slug/edit |
| `planning` | MealieMealPlan | IPlanningRepository | GetWeekPlanning, GetPlanningRange, AddMeal, DeleteMeal, GetStats | usePlanning | /planning, /stats |
| `shopping` | ShoppingItem, ShoppingList, ShoppingLabel | IShoppingRepository | GetShoppingItems, AddItem, AddRecipesToList, ToggleItem, DeleteItem, ClearList | useShopping, useCategorizeItems | /shopping |
| `organizer` | MealieFood, MealieUnit, MealieCategory, MealieTag | IFoodRepository, IUnitRepository, ICategoryRepository, ITagRepository | GetFoods, CreateFood, GetUnits, GetCategories, GetTags | useFoods, useUnits, useCategories, useTags | (transverse) |
| `assistant` (LLM) | LLMConfig | (pas de repo Mealie — utilise application/usecases via tools) | (services, pas use cases) | useAssistant | (transverse : AssistantDrawer) |
| `theme` | ThemeConfig | (pas de repo — localStorage) | (service ThemeService) | useTheme | (transverse : Settings) |

### 3.3 Dépendances entre modules fonctionnels

- `recipe` → `organizer` : `resolveIngredients` utilise `GetFoodsUseCase` + `GetUnitsUseCase` pour résoudre les foods/units des ingrédients à la sauvegarde d'une recette.
- `shopping` → `recipe` : `AddRecipesToListUseCase` charge les recettes par IDs (`GetRecipesByIdsUseCase`) pour récupérer leurs ingrédients et les ajouter à la liste "Bonap".
- `planning` → `recipe` : `GetStatsUseCase` charge les recettes des repas planifiés pour calculer `computeCategoryStats`.
- `assistant` → `recipe`, `planning` : les tools `search_recipe` et `add_to_planning` invoquent les use cases des domaines recipe et planning.
- `shopping` → `organizer` : `FoodLabelStore` associe un food (clé normalisée) à un label — `extractFoodKey` est dans `shared/utils/food.ts`.

### 3.4 Composants transverses `presentation/components/`

| Composant | Utilisé par | Dépend amont |
|---|---|---|
| `Layout` | App.tsx (toutes les routes) | Sidebar, AssistantDrawer |
| `Sidebar` | Layout | useTheme (pour icône), React Router NavLink |
| `AssistantDrawer` | Layout | useAssistant, AssistantService (streaming) |
| `RecipeCard` | RecipesPage, SuggestionsPage | SeasonBadge, RecipeDetailModal trigger |
| `RecipeDetailModal` | RecipesPage, RecipeCard, PlanningPage | useRecipe |
| `RecipeFormDialog` | RecipeFormPage | useRecipeForm, useFoods, useUnits, useCategories, useTags, Autocomplete |
| `RecipePickerDialog` | PlanningPage | useRecipesInfinite |
| `RecipeIngredientsList` | RecipeDetailModal, RecipeFormPage | — |
| `RecipeInstructionsList` | RecipeDetailModal, RecipeFormPage | react-markdown |
| `SeasonBadge` | RecipeCard, RecipeDetailModal | shared/utils/season.ts |
| `Autocomplete` | RecipeFormDialog, ShoppingPage | Radix portal |

### 3.5 Dépendances de build / runtime

- `vite.config.ts` configure :
  - Plugin React (`@vitejs/plugin-react`)
  - Plugin Tailwind (`@tailwindcss/vite`)
  - Plugin legacy (`@vitejs/plugin-legacy` pour navigateurs anciens)
  - Proxy dev : `/api` → `VITE_MEALIE_URL`, `/anthropic`, `/openai`, `/google-ai`, `/api/opencode`, `/api/opencode-go` (contournement CORS en dev)
- En production : aucun proxy Vite. Requêtes directes vers `VITE_MEALIE_URL` et les endpoints LLM (configurés pour exposer CORS ou proxifiés via nginx).

---

## 4. Dépendances techniques (npm)

### 4.1 Dépendances runtime

| Package | Version | Rôle |
|---|---|---|
| `react` | 19.2 | Framework UI |
| `react-dom` | 19.2 | Rendu DOM |
| `react-router-dom` | 7.13 | Routing |
| `@radix-ui/react-dialog` | 1.1 | Modals (RecipeDetail, RecipeForm, RecipePicker) |
| `@radix-ui/react-slot` | 1.2 | Composition composants shadcn |
| `@radix-ui/react-tooltip` | 1.2 | Tooltips UI |
| `class-variance-authority` | 0.7 | Variants composants shadcn |
| `clsx` | 2.1 | Concat classes |
| `tailwind-merge` | 3.6 | Résolution conflits Tailwind |
| `lucide-react` | 1.14 | Icônes |
| `react-markdown` | 10.1 | Rendu instructions recette |
| `rehype-raw` | 7.0 | Markdown HTML brut |
| `express` | 5.2 | Serveur prod (preview / static + fallback SPA) |

### 4.2 Dépendances dev

| Package | Version | Rôle |
|---|---|---|
| `vite` | 8 | Bundler |
| `@vitejs/plugin-react` | 6 | JSX Fast Refresh |
| `@vitejs/plugin-legacy` | 8 | Transpile anciens navigateurs |
| `@tailwindcss/vite` | 4.2 | Plugin Tailwind Vite |
| `tailwindcss` | 4.2 | Styles |
| `autoprefixer` | 10.4 | Autoprefix CSS |
| `postcss` | 8.5 | Pipeline CSS |
| `terser` | 5.47 | Minification prod |
| `typescript` | 6.0 | Typage |
| `@types/react`, `@types/react-dom`, `@types/node` | 19 / 19 / 26 | Types |
| `eslint` | 9.39 | Linter |
| `typescript-eslint`, `@typescript-eslint/*` | 8.64 | Parser ESLint TS |
| `eslint-config-prettier` | 10.1 | Désactive règles ESLint qui entrent en conflit avec Prettier |
| `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` | 7.37 / 7 / 0.5 | Règles React |
| `prettier` | 3.8 | Formatage |
| `globals` | 17.6 | Variables globales ESLint |
| `vitest` | 4.1 | Runner de tests |
| `@vitest/coverage-v8` | 4.1 | Couverture |
| `jsdom` | 29.1 | DOM Virtuel pour tests hooks |
| `@testing-library/react` | 16.3 | Tests composants |
| `@testing-library/jest-dom` | 6.9 | Matchers DOM |
| `@testing-library/user-event` | 14.6 | Simulations user |
| `@playwright/test` | 1.59 | Tests E2E |
| `wait-on` | 9.0 | Attendre dev server avant E2E |

### 4.3 Dépendances à ajouter (v1.1 / v2.0)

| Package | Version cible | Rôle | Quand |
|---|---|---|---|
| `vite-plugin-pwa` | dernier | Service worker + manifest + offline | v1.1 (PWA) |
| `workbox-window` | dernier | Communication SW ↔ page | v1.1 (PWA) |
| `pdf-lib` ou `@react-pdf/renderer` | dernier | Génération PDF menu + liste | v1.1 (Export PDF) |
| `i18next` + `react-i18next` | dernier | Internationalisation | v1.1 (i18n) |
| `@axe-core/playwright` | dernier | Audit WCAG automatisé | v1.1 (accessibilité) |
| `nutriparser` ou API tierce | à valider | Macros / calories | v2.0 (nutrition) |
| `idb` (IndexedDB wrapper) | dernier | Cache offline planning + shopping | v1.1 (PWA offline) |

---

## 5. Intégrations externes

### 5.1 API Mealie (backend unique)

**Auth** : `Authorization: Bearer <VITE_MEALIE_TOKEN>` sur toutes les requêtes.

**Client HTTP** : `MealieApiClient` (singleton dans `src/infrastructure/mealie/api/index.ts`). Méthodes : `get`, `post`, `put`, `patch`, `delete`, `uploadImage` (multipart), `postSse` (streaming, pour Anthropic tool use).

**Endpoints utilisés** (v1.0) :

| Méthode | Endpoint | Usage | Use case |
|---|---|---|---|
| GET | `/api/recipes` | Liste paginée (search, categories, tags, maxTotalTime) | GetRecipesUseCase |
| GET | `/api/recipes/:slug` | Détail | GetRecipeUseCase |
| POST | `/api/recipes` `{ name }` | Création (retourne slug string ou `{slug}`) | CreateRecipeUseCase |
| PATCH | `/api/recipes/:slug` | Update | UpdateRecipeUseCase, UpdateSeasonsUseCase, UpdateCategoriesUseCase |
| PUT | `/api/recipes/:slug/image` | Upload image (multipart) | CreateRecipeUseCase, UpdateRecipeUseCase |
| GET | `/api/households/mealplans` | Planning sur plage | GetWeekPlanningUseCase, GetPlanningRangeUseCase |
| POST | `/api/households/mealplans` | Ajout repas | AddMealUseCase |
| DELETE | `/api/households/mealplans/:id` | Suppression repas | DeleteMealUseCase |
| GET | `/api/households/shopping/lists` | Liste des listes | GetShoppingItemsUseCase |
| POST | `/api/households/shopping/lists` `{ name }` | Création liste | (interne : getOrCreateDefaultList, getOrCreateHabituelsList) |
| GET | `/api/households/shopping/lists/:id` | Items + labels | GetShoppingItemsUseCase |
| POST | `/api/households/shopping/items/create-bulk` | Ajout bulk | AddRecipesToListUseCase |
| PUT | `/api/households/shopping/items` | Update item | ToggleItemUseCase |
| DELETE | `/api/households/shopping/items?ids=&ids=&` | Suppression multi (`&` final requis) | DeleteItemUseCase, ClearListUseCase |
| GET | `/api/organizers/categories` | Catégories | GetCategoriesUseCase |
| GET | `/api/organizers/tags` | Tags | GetTagsUseCase |
| GET | `/api/foods?page=1&perPage=-1` | Tous les foods | GetFoodsUseCase |
| POST | `/api/foods` `{ id: "", name, description: "" }` | Création food | CreateFoodUseCase |
| GET | `/api/units` | Unités | GetUnitsUseCase |
| GET | `/api/media/recipes/:id/images/min-original.webp` | Image recette (proxiéée) | (direct img src) |

**Endpoints à ajouter** (v1.1 / v2.0) :

| Méthode | Endpoint | Usage | Version |
|---|---|---|---|
| POST | `/api/recipes/scrape-url` `{ url }` | Scrape recette depuis URL | v1.1 (import URL) |
| GET | `/api/organizers/cookbooks` | Liste cookbooks | v2.0 (cookbook) |
| POST | `/api/organizers/cookbooks` | Création cookbook | v2.0 |
| GET | `/api/households` | Liste households | v2.0 (multi-households) |
| POST | `/api/households/invitations` | Inviter membre | v2.0 |
| GET | `/api/recipes/:slug/share` | Lien partage public | v2.0 (partage) |

**Quirks Mealie à préserver côté infrastructure** :
- POST `/api/recipes` retourne tantôt un string, tantôt `{ slug }` — le repo gère les deux.
- DELETE shopping items : la query string doit se terminer par `&` (sans quoi Mealie ignore la requête).
- PUT shopping items : retourne parfois `null` — fallback sur les données envoyées.
- Tags saison : préfixe `saison-` (ex: `saison-ete`). Filtrage saison côté client car l'API ne supporte pas les saisons nativement.
- Pagination : l'API retourne `per_page` / `total_pages` (snake_case) — le repo normalise en camelCase.
- `perPage=-1` : récupère tout en une requête (référentiels uniquement, pas les recettes).

### 5.2 APIs LLM

Voir §2.5 pour le tableau complet des 9 providers. Points d'intégration côté Bonap :

- **`AssistantService`** (`infrastructure/llm/AssistantService.ts`) : streaming Anthropic + tool use. Tools : `search_recipe`, `add_to_planning`, `create_recipe`. Fallback non-streaming pour les autres 8 providers.
- **`LLMService`** (`infrastructure/llm/LLMService.ts`) : single-turn. Dispatch par `provider`. Utilisé par `SuggestionsPage` pour générer 5 suggestions JSON.
- **`LLMConfigService`** (`infrastructure/llm/LLMConfigService.ts`) : persistance localStorage `bonap_llm_config`. Clé, provider, modèle, température.

**Proxy Vite dev** (contournement CORS) :
- `/api` → `VITE_MEALIE_URL`
- `/anthropic` → `https://api.anthropic.com`
- `/openai` → `https://api.openai.com`
- `/google-ai` → `https://generativelanguage.googleapis.com`
- `/api/opencode` → `https://opencode.ai/zen/v1`
- `/api/opencode-go` → `https://opencode.ai/zen/go/v1`
- Ollama : pas de proxy (localhost:11434 direct)

En production, ces proxies sont reproduits via nginx (ou l'utilisateur configure les providers pour exposer CORS).

### 5.3 Aucune autre intégration externe

Pas de Sentry, pas d'analytics, pas de payment, pas d'auth tierce (l'auth est côté Mealie via le token). Les données utilisateur restent dans Mealie.

---

## 6. Modèle de données

Bonap ne possède **pas de base de données propre**. Toutes les données sont dans Mealie, exposées via son API REST. Bonap maintient uniquement des types TypeScript et de la persistance localStorage.

### 6.1 Entités Mealie (types purs dans `shared/types/mealie.ts`)

#### `MealieRecipe`
```typescript
{
  id: string
  slug: string
  name: string
  description?: string
  image?: string
  recipeCategory?: string[]
  tags?: string[]              // tags Mealie, peut inclure "saison-ete", "saison-hiver"…
  prepTime?: string            // ISO 8601 (PT30M)
  performTime?: string         // ISO 8601
  recipeIngredient?: MealieRecipeIngredient[]
  recipeInstructions?: MealieRecipeInstruction[]
  extras?: Record<string, unknown>
}
```

#### `MealieRecipeIngredient`
```typescript
{
  id?: string
  note?: string                // texte libre (ex: "1 cuillère à soupe")
  quantity?: number
  unit?: { id?: string; name?: string; description?: string } | null
  food?: { id?: string; name?: string; description?: string } | null
}
```

#### `MealieRecipeInstruction`
```typescript
{
  id?: string
  text: string                 // markdown
  title?: string
}
```

#### `MealieMealPlan`
```typescript
{
  id: number
  date: string                 // YYYY-MM-DD
  entryType: string            // "lunch" | "dinner"
  title?: string
  recipeId?: string
  recipe?: MealieRecipe        // populated côté Mealie
}
```

#### `MealieShoppingList`
```typescript
{
  id: string
  name: string                 // "Bonap" | "Habituels"
  labels: MealieShoppingLabel[]
}
```

#### `MealieShoppingItem`
```typescript
{
  id: string
  shoppingListId: string
  checked: boolean
  position: number
  isFood: boolean
  note?: string
  quantity?: number
  unitName?: string
  foodName?: string
  foodId?: string
  label?: MealieShoppingLabel | null
  display?: string             // "Bonap" (nom de la liste agrégée)
  recipeNames?: string[]
  source: "mealie"
}
```

#### `MealieShoppingLabel`
```typescript
{
  id: string
  name: string                 // "Fruits", "Légumes", "Frais"…
  color?: string
}
```

#### Référentiels organizer
- `MealieFood` : `{ id: string; name: string; description?: string }`
- `MealieUnit` : `{ id: string; name: string; description?: string }`
- `MealieCategory` : `{ id: string; name: string; slug: string }`
- `MealieTag` : `{ id: string; name: string; slug: string }`

### 6.2 Entités métier Bonap (dans `domain/shopping/entities/`)

Ces entités sont la **représentation métier purifiée** que manipulent les use cases et les hooks. Elles ne contiennent aucune notion "Mealie" — les repos font la conversion.

#### `ShoppingItem` (entité métier)
```typescript
{
  id: string
  shoppingListId: string
  checked: boolean
  position: number
  isFood: boolean
  note?: string
  quantity?: number
  unitName?: string
  foodName?: string
  label?: ShoppingLabel | null
  display?: string
  recipeNames?: string[]
  source: "mealie"
}
```

#### `ShoppingList`
```typescript
{
  id: string
  name: string
  labels: ShoppingLabel[]
}
```

#### `ShoppingLabel`
```typescript
{
  id: string
  name: string
  color?: string
}
```

### 6.3 Entités futures (v1.1 / v2.0)

| Entité | Domaine | Version | Source |
|---|---|---|---|
| `MealieScrapeResult` | recipe | v1.1 | POST `/api/recipes/scrape-url` |
| `Cookbook` | cookbook | v2.0 | `/api/organizers/cookbooks` |
| `Household` | household | v2.0 | `/api/households` |
| `ShareLink` | recipe | v2.0 | `/api/recipes/:slug/share` |
| `NutritionInfo` | nutrition | v2.0 | service tiers (à définir) |
| `Preferences` | planning | v2.0 | localStorage `bonap_preferences` (profil pour planning auto IA) |
| `PlannedWeek` | planning | v2.0 | sortie du générateur IA (à valider côté user avant POST) |

### 6.4 Persistance locale (localStorage)

| Clé | Format | Rôle |
|---|---|---|
| `bonap:food_labels` | `Record<foodKey, labelId>` | FoodLabelStore — pré-assignation auto des labels shopping |
| `bonap_llm_config` | `LLMConfig` | LLMConfigService — provider + clé + modèle + température |
| `bonap_theme` | `"light" \| "dark" \| "system"` | ThemeService |
| `bonap_accent` | `string` (oklch preset) | ThemeService — couleur d'accent |
| `bonap:planning_cache` (v1.1, PWA) | JSON sérialisé | Cache planning offline (à ajouter, idéalement via IndexedDB) |
| `bonap:preferences` (v2.0) | JSON sérialisé | Profil préférences pour planning auto IA |

---

## 7. Contrats d'interface (repositories)

Toutes les interfaces vivent dans `src/domain/{domaine}/repositories/I{Entity}Repository.ts`. Les implémentations concrètes sont dans `src/infrastructure/mealie/repositories/`.

### 7.1 `IRecipeRepository`

```typescript
interface IRecipeRepository {
  getAll(page?: number, perPage?: number, filters?: RecipeFilters): Promise<MealiePaginatedRecipes>
  getBySlug(slug: string): Promise<MealieRecipe>
  getByIds(ids: string[]): Promise<MealieRecipe[]>
  create(name: string): Promise<string>              // retourne le slug
  update(slug: string, data: RecipeFormData): Promise<MealieRecipe>
  updateSeasons(slug: string, seasons: Season[]): Promise<MealieRecipe>
  updateCategories(slug: string, categories: string[]): Promise<MealieRecipe>
  uploadImage(slug: string, file: File): Promise<void>
  // v1.1 : scrapeFromUrl(url: string): Promise<MealieScrapeResult>
  // v2.0 : share(slug: string): Promise<ShareLink>
}

interface RecipeFilters {
  search?: string
  categories?: string[]
  tags?: string[]
  maxTotalTime?: number
  seasons?: Season[]
}
```

### 7.2 `IPlanningRepository`

```typescript
interface IPlanningRepository {
  getWeekPlanning(startDate: string, endDate: string): Promise<MealieMealPlan[]>
  getRange(start: string, end: string): Promise<MealieMealPlan[]>
  addMeal(input: { date: string; entryType: "lunch" | "dinner"; recipeId: string }): Promise<MealieMealPlan>
  deleteMeal(id: number): Promise<void>
}
```

### 7.3 `IShoppingRepository`

```typescript
interface IShoppingRepository {
  getOrCreateDefaultList(): Promise<ShoppingList>      // "Bonap"
  getOrCreateHabituelsList(): Promise<ShoppingList>    // "Habituels"
  getItems(listId: string): Promise<{ items: ShoppingItem[]; labels: ShoppingLabel[] }>
  addItem(listId: string, data: AddItemInput): Promise<ShoppingItem>
  addItems(listId: string, items: AddItemInput[]): Promise<ShoppingItem[]>
  updateItem(listId: string, item: ShoppingItem): Promise<ShoppingItem>
  deleteItem(listId: string, itemId: string): Promise<void>
  deleteCheckedItems(listId: string, items: ShoppingItem[]): Promise<void>
  deleteAllItems(listId: string, items: ShoppingItem[]): Promise<void>
}

interface AddItemInput {
  note?: string
  quantity?: number
  isFood?: boolean
  unitName?: string
  foodName?: string
  foodId?: string
  labelId?: string
}
```

### 7.4 `IFoodRepository`, `IUnitRepository`, `ICategoryRepository`, `ITagRepository`

```typescript
interface IFoodRepository {
  getAll(): Promise<MealieFood[]>
  create(name: string): Promise<MealieFood>           // id: "", name, description: ""
}

interface IUnitRepository {
  getAll(): Promise<MealieUnit[]>
  // Pas de create : les unités ne sont pas créées automatiquement (lookup only)
}

interface ICategoryRepository {
  getAll(): Promise<MealieCategory[]>
}

interface ITagRepository {
  getAll(): Promise<MealieTag[]>
  // v1.1 : create(name: string): Promise<MealieTag>
}
```

### 7.5 Contrats futurs (v1.1 / v2.0)

| Interface | Domaine | Version | Méthodes clés |
|---|---|---|---|
| `IUrlImportRepository` | recipe | v1.1 | `scrapeUrl(url: string): Promise<MealieScrapeResult>` |
| `IPdfExportService` | infrastructure | v1.1 | `exportWeekMenu(plan, items): Promise<Blob>`, `exportShoppingList(list, items): Promise<Blob>` |
| `ICookbookRepository` | cookbook | v2.0 | `getAll()`, `create(name)`, `addRecipe(cookbookId, recipeId)`, `removeRecipe()` |
| `IHouseholdRepository` | household | v2.0 | `getCurrent()`, `switch(householdId)`, `listMembers()`, `invite(email)` |
| `IShareRepository` | recipe | v2.0 | `createShareLink(slug): Promise<ShareLink>`, `getSharedByToken(token)` |
| `INutritionService` | nutrition | v2.0 | `computeForRecipe(recipe): Promise<NutritionInfo>`, `aggregateForWeek(plan): Promise<NutritionInfo>` |
| `IPlanningGeneratorService` | planning | v2.0 | `generateWeek(preferences, history): Promise<PlannedWeek>` (LLM structurant + validation) |
| `IPreferencesRepository` | planning | v2.0 | `get()`, `update(prefs)` (localStorage) |
| `II18nService` | infrastructure | v1.1 | `t(key, params)`, `changeLanguage(lang)`, `getCurrent()` |

---

## 8. Séquencement des modules

### 8.1 État courant (v1.0 livrée)

Séquencement déjà effectué (préserver) :

1. **Couche `shared/types`** — types Mealie, LLM, errors (fondation, aucune dépendance).
2. **Couche `shared/utils`** — date, duration, food, season.
3. **Couche `infrastructure/mealie/api`** — MealieApiClient + IMealieApiClient + singleton.
4. **Couche `domain/*/repositories`** — interfaces pures.
5. **Couche `infrastructure/mealie/repositories`** — implémentations concrètes (RecipeRepository, PlanningRepository, ShoppingRepository, CategoryRepository, TagRepository, FoodRepository, UnitRepository).
6. **Couche `application/*/usecases`** — use cases par domaine, injection des repos.
7. **Couche `infrastructure/container.ts`** — singleton central.
8. **Couche `infrastructure/llm`** — LLMService, AssistantService, LLMConfigService.
9. **Couche `infrastructure/theme`** — ThemeService.
10. **Couche `infrastructure/shopping`** — FoodLabelStore, RecipeSlugStore (localStorage).
11. **Couche `presentation/components/ui`** — shadcn/ui (button, badge, card, dialog, input, label, autocomplete).
12. **Couche `presentation/components`** — Layout, Sidebar, AssistantDrawer, modals.
13. **Couche `presentation/hooks`** — un hook par use case ou groupe de use cases.
14. **Couche `presentation/pages`** — pages React Router.
15. **Couche `App.tsx` + `main.tsx`** — routes + entry.

### 8.2 Séquencement v1.1 (robustesse + mobile)

**Ordre recommandé** (tests d'abord, puis features, puis polish) :

1. **Tests E2E Playwright** (skill `e2e-test-gen`) — setup + 1er parcours `add-recipe-to-planning`. Couvre v1.0 existant pour empêcher les régressions pendant les features v1.1.
2. **Accessibilité** (skill `accessibility-audit`) — audit WCAG AA sur pages critiques + corrections (focus, aria-labels, contrastes).
3. **i18n** (skill `i18n-extract`) — extraction + FR de base + EN placeholder + switch dans Settings. À faire avant PWA pour que les strings offline soient i18n-ready.
4. **PWA / offline** — `vite-plugin-pwa` + `workbox-window` + cache stratégie (network-first pour API Mealie, cache-first pour assets). IndexedDB pour cache planning/shopping offline.
5. **Import URL** — extension `IRecipeRepository` + endpoint `/api/recipes/scrape-url` + UI bouton dans RecipesPage.
6. **Export PDF** — `IPdfExportService` + `pdf-lib` ou `@react-pdf/renderer` + bouton dans PlanningPage (menu hebdo) et ShoppingPage (liste).
7. **Audit perfs** (skill `performance-audit`) — Lighthouse + bundle analyzer + lazy load routes non-critiques + dynamic import RecipeFormDialog.

**Dépendances v1.1 entre modules** :
- Tests E2E doivent couvrir v1.0 **avant** qu'on touque à l'i18n ou la PWA.
- i18n doit être en place **avant** PWA pour que le mode offline ait des chaînes traduites.
- Import URL est indépendant — peut être fait en parallèle des autres.
- Export PDF dépend de i18n (labels traduits dans le PDF).

### 8.3 Séquencement v2.0 (différenciation IA + manques vs Mealie)

**Ordre recommandé** (IA d'abord car c'est la différenciation principale, puis manques Mealie) :

1. **Planning auto IA** — `IPlanningGeneratorService` + `IPreferencesRepository` + `PlannedWeek` type + UI `PreferencesPage` + prompt structurant (saisons, durée, catégories, historique) + sortie à valider côté user avant POST. **Dépend : `planning` + `recipe` + `assistant` (LLM)**.
2. **Nutrition** — `INutritionService` + `NutritionInfo` type + intégration base macros/calories (à valider : base locale vs API tierce) + affichage dans RecipeDetailModal + agrégation dans StatsPage. **Dépend : `recipe` + `planning`**.
3. **Multi-households / partage familial** — `IHouseholdRepository` + switch household dans Sidebar + gestion invitations. **Dépend : `planning` + `shopping` (les listes et plannings sont household-scoped)**.
4. **Partage public de recettes** — `IShareRepository` + `createShareLink(slug)` + page publique `/shared/:token` non-authentifiée. **Dépend : `recipe`**.
5. **Cookbook / collections** — `ICookbookRepository` + `Cookbook` entité + page `/cookbooks` + ajout/retrait recettes. **Dépend : `recipe`**.

**Dépendances v2.0 entre modules** :
- Planning auto IA est standalone côté infrastructure (juste LLM + planning).
- Nutrition dépend du planning (agrégation semaine).
- Multi-households modifie le comportement de `planning` et `shopping` (filtrage par household).
- Partage et cookbook sont indépendants — peuvent être menés en parallèle.

### 8.4 Visualisation du séquencement

```
v1.0 (livrée)
  ├─ shared → domain → application → infrastructure → presentation
  └─ recipe, planning, shopping, organizer, assistant, theme

v1.1 (robustesse + mobile)
  ├─ E2E (couvre v1.0)
  ├─ Accessibilité (couvre v1.0)
  ├─ i18n (couvre tout)
  ├─ PWA (couvre tout + offline)
  ├─ Import URL (extension recipe)
  ├─ Export PDF (nouveau service transverse)
  └─ Perfs audit (couvre tout)

v2.0 (IA + manques Mealie)
  ├─ Planning auto IA (assistant + planning + preferences)
  ├─ Nutrition (recipe + planning + service tiers)
  ├─ Multi-households (planning + shopping + household repo)
  ├─ Partage public (recipe + share repo)
  └─ Cookbook (recipe + cookbook repo)
```

---

## 9. Points d'attention architecturaux

### 9.1 Extensions sans casser l'existant

- Toute nouvelle feature DDD commence par une interface dans `domain/*/repositories/`, puis une implémentation dans `infrastructure/mealie/repositories/`, puis un use case dans `application/*/usecases/`, puis un hook dans `presentation/hooks/`, puis une page dans `presentation/pages/`. Le skill `scaffold-ddd-feature` (à créer en v1.1) automatisera ce scaffolding.
- Les use cases nouveaux ne doivent pas casser les signatures existantes — ajouter des méthodes plutôt que modifier.
- Les hooks nouveaux ne doivent pas importer directement `infrastructure` — toujours via `container.ts`.

### 9.2 Compatibilité API Mealie future

- Mealie est un projet actif : l'API peut évoluer. Toute la logique de compatibilité (snake_case → camelCase, gestion des retours polymorphes, quirks DELETE avec `&` final) doit rester dans `infrastructure/mealie/` — ne jamais fuir vers `application` ou `domain`.
- Quand Mealie change une signature, seule l'implémentation du repo concerné est modifiée — les use cases et hooks ne bougent pas.

### 9.3 LLM provider abstraction

- `LLMService` et `AssistantService` doivent rester provider-agnostic. Le dispatch `provider → fetchHelper` centralise les spécificités (headers, format de réponse, streaming vs non-streaming).
- Anthropic est le seul provider avec streaming + tool use. Si une feature critique dépend du tool use (ex: planning auto IA v2.0), imposer Anthropic pour cette feature et fallback sur les autres providers avec un parcours dégradé (ex: pas de tool use, mais single-turn prompt structurant → JSON parse).
- Ne pas coupler `assistant` à `recipe` ou `planning` directement — les tools sont un bridge au runtime via `container.ts`, pas une dépendance compile-time.

### 9.4 PWA / offline (v1.1)

- Cache stratégie :
  - **App shell** (HTML, JS, CSS) : cache-first (mise à jour en arrière-plan via Workbox).
  - **API Mealie (GET)** : network-first, fallback cache (stale-while-revalidate).
  - **Images recettes** : cache-first (long TTL).
  - **Mutations (POST/PATCH/DELETE)** : queue en IndexedDB si offline, replay au retour réseau.
- Ne pas mettre en cache les tokens LLM (sécurité).
- Le cache offline doit respecter i18n (chaînes traduites mises en cache avec le bon locale).

### 9.5 Multi-households (v2.0)

- Le `MealieApiClient` doit devenir household-aware : le `householdId` est passé en header ou en query string selon l'endpoint Mealie.
- Le container.ts doit exposer un `householdContext` (mutable) que les repos consultent à chaque appel.
- UI : switch dans la Sidebar (dropdown) + persistance dans localStorage `bonap:current_household`.

### 9.6 Sécurité

- Le token Mealie (`VITE_MEALIE_TOKEN`) est exposé côté client (inévitable en SPA sans backend). Documenter ce trade-off dans le README — l'utilisateur doit savoir que son token est dans le bundle côté navigateur.
- Les clés API LLM sont stockées dans localStorage. Pas de transmission vers un backend tiers (elles vont directement aux APIs LLM).
- Le partage public de recettes (v2.0) ne doit exposer que les champs publics (pas le token, pas les clés).

### 9.7 Performance

- Bundle actuel à surveiller : `react-markdown` + `rehype-raw` (lourd), `lucide-react` (tree-shaking à vérifier), `@radix-ui/*` (modulaire OK).
- Pages non-critiques à lazy-loader : `/stats`, `/suggestions`, `/settings` (en v1.1 via audit perfs).
- Composants lourds à dynamic import : `RecipeFormDialog` (utilise tous les autocompletes), `RecipeDetailModal` (utilise react-markdown).
- Scroll infini `useRecipesInfinite` : éviter les re-renders inutiles (memo sur RecipeCard, key stable).

---

## 10. Risques techniques et mitigations

| Risque | Impact | Probabilité | Mitigation |
|---|---|---|---|
| Mealie API change sans notice (breaking change) | Élevé — casse plusieurs repos | Moyenne | Tests E2E couvrent les endpoints critiques ; versionning du `MealieApiClient` si divergence majeure |
| Token Mealie exposé côté client | Moyen — sécurité self-hosted | Avéré (conception SPA) | Documenter dans README ; recommander un token scoped à household ; v2.0 envisager un mini-backend proxy |
| Provider LLM hors-Anthropic sans tool use | Moyen — parcours dégradé | Avéré | Documenter que les tools IA sont Anthropic-only ; prévoir fallback single-turn JSON pour planning auto IA v2.0 |
| Bundle size trop gros pour mobile (LCP > 2.5s) | Moyen — UX mobile | Moyenne | Audit perfs en v1.1 ; lazy load + dynamic import ; Lighthouse CI |
| PWA offline mal testée (sync conflict) | Moyen — perte données | Moyenne | IndexedDB queue avec ID stable ; replay idempotent ; tests E2E offline |
| i18n extraction manquée (chaînes oubliées) | Faible — UX incomplète | Élevée | Skill `i18n-extract` avec regex + revue manuelle ; test visuel post-traduction |
| Multi-households casse planning/shopping existants | Élevé — régression v1.0 | Faible | Feature flag `multiHouseholdsEnabled` ; tests E2E couvrent le parcours single-household avant et après |
| Planning auto IA génère des repas non voulus | Faible — user rejette | Moyenne | Sortie en brouillon (pas de POST direct) ; user valide avant application ; bouton "regénérer" |
| Nutrition : pas de base gratuite fiable | Moyen — feature bloquée | Moyenne | Évaluer Open Food Facts (gratuit, FR) vs API payante ; fallback sur saisie manuelle |

---

## 11. Skills spécialisés à créer (skill-creator)

> Skills IA à créer en local via `skill-creator` pour outiller l'exécution de ce PDL. Ils sont déjà identifiés dans le MVP-SCOPE — rappel ici avec focus technique PDL.

### Skill : `scaffold-ddd-feature`
Génère l'arborescence complète d'un nouveau domaine DDD (entity → repository interface → repo impl Mealie → use case → container.ts → hook → page → route). À utiliser pour chaque nouveau domaine v1.1/v2.0 (`cookbooks`, `households`, `nutrition`, `share`, `preferences`).

### Skill : `e2e-test-gen`
Génère des tests Playwright pour les parcours critiques. Priorité v1.1 : couvrir v1.0 existant avant d'ajouter des features. Mock Mealie via `page.route` ou MSW.

### Skill : `i18n-extract`
Extrait les chaînes JSX vers `src/i18n/locales/fr.json` + `en.json` + config `src/i18n/config.ts`. À lancer en v1.1 sur tout `src/presentation/`.

### Skill : `accessibility-audit`
Audite WCAG AA via `@axe-core/playwright` + analyse manuelle des patterns Radix (Dialog, Autocomplete, Tooltip). À lancer en v1.1 sur les pages critiques.

### Skill : `performance-audit`
Lighthouse + `vite-bundle-visualizer` + recommandations prioritisées (lazy load, dynamic import, tree-shaking). À lancer en v1.1 après les features.

### Skill : `recipe-migration` (optionnel)
Migre des recettes depuis formats externes (Paprika, Mealie JSON, texte libre) vers Mealie via l'API. Utile si l'utilisateur arrive avec un catalogue existant dans une autre app.

### Skill : `pwa-offline-setup` (nouveau, à créer en v1.1)
Configure `vite-plugin-pwa` + Workbox + IndexedDB queue pour mutations offline. Génère le service worker avec stratégies de cache par catégorie (app shell, API GET, images).

### Skill : `pdf-export-builder` (nouveau, à créer en v1.1)
Génère les templates PDF (menu hebdo + liste de courses) avec `pdf-lib` ou `@react-pdf/renderer`. Gère l'i18n dans le PDF (labels traduits).

---

## 12. MCP spécialisés à créer / installer

> MCP custom à développer + MCP existants à installer pour outiller Claude Code sur ce PDL. Identifiés dans le MVP-SCOPE — rappel avec focus technique.

### MCP custom : `mealie-api`
Expose l'API Mealie à Claude Code via MCP (stdio, TypeScript, `@modelcontextprotocol/sdk`). Réutilise la logique de `MealieApiClient` (shared-core ou copie). Outils : `search_recipes`, `get_recipe`, `create_recipe`, `update_recipe`, `list_planning`, `add_meal`, `delete_meal`, `get_shopping_list`, `add_shopping_items`, `delete_shopping_items`, `list_categories/tags/foods/units`, `create_food`. Resources : `mealie://recipe/{slug}`, `mealie://planning/{date}`, `mealie://shopping/list/{name}`, `mealie://categories`, `mealie://tags`, `mealie://foods`, `mealie://units`. Installation : `claude mcp add mealie-api -- node /home/zephus/Projets/bonap/mcp/mealie-api/server.js` avec env `MEALIE_URL` + `MEALIE_TOKEN`.

### MCP custom : `bonap-pdf` (nouveau, à créer en v1.1)
Expose la génération PDF (menu + liste) à Claude Code pour debug des templates. Outil : `render_week_menu_pdf(plan, items)`, `render_shopping_list_pdf(list, items)`.

### MCP custom : `bonap-nutrition` (nouveau, à créer en v2.0)
Wrappe la base nutrition (Open Food Facts ou API tierce). Outils : `lookup_food_nutrition(foodName)`, `compute_recipe_nutrition(ingredients)`, `aggregate_week_nutrition(plan)`.

### MCP existants à installer

| MCP | Commande | Usage PDL |
|---|---|---|
| Playwright MCP | `claude mcp add playwright -- npx -y @playwright/mcp-server` | Tests E2E v1.1, captures visuelles pour accessibilité |
| Context7 MCP | `claude mcp add context7 -- npx -y @upstash/context7-mcp` | Doc libs à jour (React 19, Radix, Vite 8, Tailwind v4, React Router v7, Workbox, i18next, pdf-lib) pendant implémentation |
| GitHub MCP | `claude mcp add github -- npx -y @modelcontextprotocol/server-github` | PRs, reviews, issues pour workflow solo |
| Filesystem MCP | `claude mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem /home/zephus/Projets/bonap` | Accès fichiers étendu |
| Sentry MCP (v1.1+) | `claude mcp add sentry -- npx -y @sentry/mcp-server` | Observabilité prod (self-hosted Sentry ou sentry.io) |
| Sequential Thinking MCP | `claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking` | Raisonnement structuré pour planning auto IA v2.0, refactoring multi-households |

---

## Écho de vérification

Bonap est un front-end React 19 + TypeScript strict + Vite 8 + Tailwind v4 + React Router v7 + shadcn/ui en architecture DDD 5 couches (domain / application / infrastructure / presentation / shared), avec un container singleton pour l'injection de dépendances et des hooks custom sans Redux/Zustand/React Query. Le backend est imposé : Mealie self-hosted, exposé via 19 endpoints API REST authentifiés par Bearer token, absorbés côté `infrastructure/mealie/` pour neutraliser les quirks (DELETE avec `&` final, POST recipe polymorphe, PUT shopping items null, tags saison préfixe `saison-`). L'IA est multi-provider (9 fournisseurs : Anthropic streaming + tool use, 8 autres en single-turn fallback) via deux services distincts (`AssistantService` streaming, `LLMService` single-turn). Le modèle de données est entièrement dans Mealie — Bonap ne persiste que 4 clés localStorage (food_labels, llm_config, theme, accent).

Le PDL prépare v1.1 (PWA offline via Workbox + IndexedDB, import URL bridge Mealie `scrape-url`, export PDF menu + liste, i18n i18next + react-i18next, accessibilité WCAG AA via axe-core, tests E2E Playwright couvrant v1.0 avant features) et v2.0 (planning auto IA via prompt structurant + validation user, nutrition via base macros + agrégation semaine, multi-households via householdContext mutable, partage public token-based, cookbook collections). Le séquencement v1.1 met les tests E2E et l'accessibilité en premier pour protéger v1.0 des régressions pendant les features. Le séquencement v2.0 commence par le planning auto IA (différenciation principale) puis les manques vs Mealie natif. 7 skills spécialisés (scaffold-ddd-feature, e2e-test-gen, i18n-extract, accessibility-audit, performance-audit, pwa-offline-setup, pdf-export-builder) + 1 skill optionnel (recipe-migration) + 2 MCP custom à développer (mealie-api existant, bonap-pdf v1.1, bonap-nutrition v2.0) + 6 MCP existants à installer (Playwright, Context7, GitHub, Filesystem, Sentry, Sequential Thinking) outillent l'exécution solo + Claude Code + sous-agents IA.