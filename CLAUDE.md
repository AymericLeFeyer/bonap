# CLAUDE.md — Bonap

Documentation technique pour Claude Code. Mis à jour à chaque session.
Dernière mise à jour : 2026-03-25.

---

## 1. Présentation du projet

**Bonap** est un front-end React pour [Mealie](https://mealie.io/), une application self-hosted de gestion de recettes et de planning de repas. Bonap remplace l'interface native de Mealie par une UI plus ergonomique et enrichie (suggestions IA, statistiques, liste d'achats avec "Habituels", thème/couleur personnalisables).

**Variables d'environnement requises** (fichier `.env` à la racine) :
```
VITE_MEALIE_URL=http://localhost:9000   # URL de l'instance Mealie
VITE_MEALIE_TOKEN=<bearer_token>        # Token API Mealie (généré dans les paramètres Mealie)
```

En développement, Vite proxie `/api` → `VITE_MEALIE_URL` (pas de CORS à gérer).
En production, `VITE_MEALIE_URL` doit être directement accessible depuis le navigateur.

---

## 2. Stack technique

| Outil | Version / détail |
|---|---|
| React | 19 |
| TypeScript | 5.9 strict |
| Vite | 8 |
| Tailwind CSS | v4 (plugin Vite `@tailwindcss/vite`) |
| React Router | v7 (sans file-based routing) |
| Design system | shadcn/ui (Radix UI + Tailwind) — composants dans `src/presentation/components/ui/` |
| Icons | `lucide-react` |
| Markdown | `react-markdown` |
| Linting | ESLint 9 + Prettier |

Pas de React Query, pas de Zustand, pas de Redux. Gestion d'état : **useState/useCallback/useRef** dans les hooks custom.

---

## 3. Architecture DDD — structure exacte

```
src/
├── domain/                          # Logique métier pure, sans dépendances externes
│   ├── organizer/
│   │   └── repositories/            # IFoodRepository, IUnitRepository, ICategoryRepository, ITagRepository
│   ├── planning/
│   │   ├── repositories/            # IPlanningRepository
│   │   └── services/                # PlanningStatsService (computeLeftoverPercentage, computeStreak, computeCategoryStats)
│   ├── recipe/
│   │   └── repositories/            # IRecipeRepository
│   └── shopping/
│       ├── entities/                # ShoppingItem, ShoppingList, ShoppingLabel
│       └── repositories/            # IShoppingRepository
│
├── application/                     # Use cases — orchestration entre repo et domain
│   ├── organizer/
│   │   └── usecases/                # GetCategoriesUseCase, GetTagsUseCase, GetFoodsUseCase, CreateFoodUseCase, GetUnitsUseCase
│   ├── planning/
│   │   └── usecases/                # GetWeekPlanningUseCase, GetPlanningRangeUseCase, AddMealUseCase, DeleteMealUseCase, GetStatsUseCase
│   ├── recipe/
│   │   └── usecases/                # GetRecipesUseCase, GetRecipeUseCase, GetRecipesByIdsUseCase, CreateRecipeUseCase, UpdateRecipeUseCase, UpdateSeasonsUseCase, UpdateCategoriesUseCase, resolveIngredients
│   └── shopping/
│       └── usecases/                # GetShoppingItemsUseCase, AddItemUseCase, AddRecipesToListUseCase, ToggleItemUseCase, DeleteItemUseCase, ClearListUseCase
│
├── infrastructure/                  # Implémentations concrètes
│   ├── container.ts                 # SINGLETON — toutes les instances repo + use case, importé par les hooks
│   ├── llm/                         # AssistantService (streaming Anthropic + tool use), LLMService (single-turn), LLMConfigService (localStorage)
│   ├── mealie/
│   │   ├── api/                     # MealieApiClient (get/post/put/patch/delete/uploadImage/postSse), IMealieApiClient, index.ts (singleton `mealieApiClient`)
│   │   └── repositories/            # RecipeRepository, PlanningRepository, ShoppingRepository, CategoryRepository, TagRepository, FoodRepository, UnitRepository
│   ├── shopping/
│   │   ├── FoodLabelStore.ts        # localStorage: food_key → labelId (mémorise les labels par aliment)
│   │   └── RecipeSlugStore.ts       # localStorage: mémorise les slugs de recettes ajoutés à la liste
│   └── theme/
│       └── ThemeService.ts          # Gestion light/dark/system + couleur d'accent (oklch), singleton `themeService`
│
├── presentation/
│   ├── components/                  # Composants partagés
│   │   ├── ui/                      # shadcn/ui: button, badge, card, dialog, input, label, autocomplete
│   │   ├── Layout.tsx               # Shell principal : Sidebar + AssistantDrawer + <Outlet>
│   │   ├── Sidebar.tsx              # Navigation latérale (desktop) / bottom bar (mobile)
│   │   ├── AssistantDrawer.tsx      # Drawer flottant avec chat IA (Anthropic streaming + tools)
│   │   ├── RecipeCard.tsx           # Carte recette (image, saisons, durée)
│   │   ├── RecipeDetailModal.tsx    # Modal détail recette (ingrédients + instructions)
│   │   ├── RecipeFormDialog.tsx     # Formulaire création/édition recette (dialog)
│   │   ├── RecipeIngredientsList.tsx
│   │   ├── RecipeInstructionsList.tsx
│   │   ├── RecipePickerDialog.tsx   # Sélecteur de recette (recherche + sélection)
│   │   └── SeasonBadge.tsx          # Badge saison coloré
│   ├── hooks/                       # Hooks custom — appellent les use cases via container.ts
│   └── pages/                       # Pages React Router
│
├── shared/
│   ├── types/
│   │   ├── mealie.ts                # Tous les types Mealie (MealieRecipe, MealieMealPlan, MealieShoppingItem…)
│   │   ├── llm.ts                   # LLMConfig, LLMProvider, DEFAULT_LLM_CONFIG, LLM_PROVIDERS
│   │   └── errors.ts                # MealieApiError, MealieNotFoundError, MealieUnauthorizedError, MealieServerError
│   └── utils/
│       ├── date.ts                  # formatDate, getWeeksBetween
│       ├── duration.ts              # formatDuration (ISO 8601 PT1H30M ↔ "1 h 30 min")
│       ├── food.ts                  # extractFoodKey (normalisation clé aliment)
│       └── season.ts                # getCurrentSeason, getRecipeSeasonsFromTags, isSeasonTag
│
├── lib/
│   └── utils.ts                     # cn() (clsx + tailwind-merge)
│
├── App.tsx                          # Routes React Router
└── main.tsx                         # Entry point (BrowserRouter, themeService.apply())
```

---

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
- `AddRecipesToListUseCase.execute(listId, recipeIds)` — ajoute les ingrédients de plusieurs recettes
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

- Méthodes : `get<T>(path)`, `post<T>(path, body)`, `put<T>(path, body)`, `patch<T>(path, body)`, `delete(path)`, `uploadImage(slug, file)`, `postSse<T>(path, body)`
- Auth : `Authorization: Bearer <VITE_MEALIE_TOKEN>` sur chaque requête
- Proxy Vite en dev : `/api/*` → `VITE_MEALIE_URL` (pas de CORS)
- En prod : requêtes directes vers `VITE_MEALIE_URL`

**Erreurs** :
- 401 → `MealieUnauthorizedError`
- 404 → `MealieNotFoundError`
- 5xx → `MealieServerError`
- Autres → `MealieApiError`

### 5.2 Endpoints utilisés

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

---

## 9. Fonctionnalité LLM / Assistant

**Deux modes** :
1. **`llmChat`** (`LLMService.ts`) : appel single-turn (system + user → text). Utilisé dans `SuggestionsPage` pour générer des suggestions JSON.
2. **`sendAssistantMessage`** (`AssistantService.ts`) : streaming multi-turn avec tool use. Utilisé dans `AssistantDrawer`.

**Providers supportés** : Anthropic (streaming + tool use), OpenAI (fallback, non-streaming), Google (fallback), Ollama (local, fallback).

**Configuration** : stockée dans localStorage (`bonap_llm_config`). Accessible dans `SettingsPage`.

**Tools de l'assistant** :
- `search_recipe` : recherche par mots-clés dans Mealie
- `add_to_planning` : ajoute une recette au planning (date + entryType)
- `create_recipe` : crée une recette dans Mealie

**Proxy Vite en dev** :
- `/anthropic` → `https://api.anthropic.com`
- `/openai` → `https://api.openai.com`
- `/google-ai` → `https://generativelanguage.googleapis.com`
- Ollama : pas de proxy (accès direct localhost:11434)

---

## 10. Thème / Design

- **Mode** : light / dark / system (localStorage `bonap_theme`)
- **Couleur d'accent** : 8 choix oklch (localStorage `bonap_accent`) — appliquée via CSS custom property `--color-primary`
- `ThemeService.themeService` (singleton) — appliqué dans `main.tsx` au démarrage et dans `useTheme`
- Design system : shadcn/ui style avec Tailwind v4
- CSS variables au format oklch (`oklch(0.62 0.18 42)`)

---

## 11. Commandes utiles

```bash
npm run dev      # Dev server (localhost:5173), proxy Mealie + LLM actif
npm run build    # tsc -b && vite build (output dans dist/)
npm run lint     # ESLint
npm run preview  # Prévisualisation du build prod
```

---

## 12. Points d'attention et pièges connus

### API Mealie
- **DELETE shopping items** : la query string doit se terminer par `&` (ex: `?ids=abc&ids=def&`). Sans le `&` final, l'API Mealie ignore la requête.
- **Création recette** : POST `/api/recipes` peut retourner `"slug"` (string) ou `{ slug: "..." }` selon les versions de Mealie — le repo gère les deux.
- **Saisons via tags** : Mealie ne connaît pas les saisons nativement. Bonap utilise les tags avec préfixe `saison-`. Lors d'un PATCH recette, il faut d'abord résoudre les IDs des tags existants avec GET `/api/organizers/tags`.
- **`perPage=-1`** : fonctionne pour récupérer toutes les entrées d'un référentiel. Ne pas utiliser pour les recettes (potentiellement des milliers).
- **updateItem shopping** : PUT `/api/households/shopping/items` retourne parfois `null` (certaines versions Mealie) — fallback sur les données envoyées.

### Durées
- Le formulaire recette prend des **minutes en integer** (`prepTime: "30"`)
- L'API Mealie stocke en **ISO 8601** (`PT30M`)
- La conversion se fait dans `RecipeRepository.minutesToIso()` à l'envoi
- L'affichage utilise `formatDuration()` qui accepte les deux formats

### Ingredients résolution
- `resolveIngredients` est appelé à chaque create/update — il fait 2 appels API (foods + units) si nécessaire
- Les aliments **sont créés** automatiquement s'ils n'existent pas dans le référentiel
- Les unités **ne sont pas créées** — si l'unité n'existe pas, `unitId` reste undefined et Mealie l'affiche comme texte libre

### Scroll infini
- `useRecipesInfinite` utilise un `loadingRef` pour éviter les double-fetch. Le `filtersKey` est sérialisé avec tri des arrays pour stabilité.

### Planning cache
- `usePlanning` maintient un cache en mémoire (`fetchedRange`). Le cache est étendu (jamais remplacé). Utile pour la navigation dans le calendrier sans re-fetch.

### Shopping
- L'ajout d'un item existant (même `foodKey`) **incrémente la quantité** plutôt que de dupliquer
- La liste "Bonap" et "Habituels" sont auto-créées dans Mealie si elles n'existent pas

### Assistant Drawer
- Les tools (`search_recipe`, `add_to_planning`, `create_recipe`) sont définis dans `AssistantService.ts` côté API et dans `useAssistant.ts` côté implémentation (les deux doivent être synchro)
- Uniquement Anthropic supporte le streaming + tool use ; les autres providers n'ont pas accès aux tools
