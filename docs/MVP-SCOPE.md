# MVP Scope — Bonap

> Document généré le 2026-08-10 par cadrage progressif.
> Catégorie de projet : SaaS B2C (front-end self-hosted sur Mealie)

## 1. Identification du projet

- **Nom** : Bonap
- **Catégorie** : SaaS B2C — front-end React self-hosted se branchant sur une instance Mealie (backend self-hosted) ; cible grand public familial.
- **Objectif** : Remplacer l'interface native de Mealie par une UI plus ergonomique, centrée sur le cas d'usage "famille organisée planifiant ses repas et listes de courses hebdomadaires", avec assistant IA intégré.
- **Échéance visée** : Pas de date critique rigide. v1.0 déjà livrée (fonctionnalités essentielles en place). v1.1 visée à ~2 mois (sprints glissants à 8h/semaine), v2.0 à ~6 mois. Releases glissantes, pas de deadline externe.

## 2. Utilisateurs cibles

| Rôle | Description | Besoin principal |
|------|-------------|------------------|
| Parent organisateur | Familles (souvent 2 parents + enfants) utilisant Mealie en self-hosted ; niveau tech moyen ; usage mobile en cuisine + desktop pour planification | Planifier les repas de la semaine rapidement, générer la liste de courses, suivre ce qui est cuisiné / en reste — sans friction |
| Cuisinier en action | Même personne que le parent, mais en contexte cuisine (mains sales, téléphone posé, besoin d'info rapide) | Voir la recette du jour lisiblement, cocher les ingrédients déjà en liste, naviguer sans recharger |
| Admin Mealie | Le parent qui a installé Mealie + Bonap sur son serveur ; niveau tech tech suffisant pour docker + .env | Configurer l'URL Mealie + le token, basculer de fournisseur LLM sans toucher au code |
| Membre famille secondaire | Conjoint / adolescent qui consulte le planning ou ajoute un repas | Voir le planning sans formation, cocher des items de liste de courses |

> Segment principal : **familles/coffrets** utilisant Mealie pour planifier repas + listes hebdomadaires. Cadrer l'ergonomie, le planning hebdomadaire et les listes partagées autour de ce public.

## 3. Problème résolu

- **Situation actuelle** : Les familles utilisant Mealie self-hosted naviguent dans l'UI native de Mealie, qui est complète mais orientée "power user" : planification dispersée sur plusieurs écrans, listes de courses séparées du planning, statistiques absentes ou basiques, pas d'assistant IA.
- **Limite / frustration** : (1) Planifier la semaine demande trop de changements de page. (2) La liste de courses n'est pas liée au planning. (3) Pas de vue "statistiques" pour comprendre ce qu'on cuisine vraiment. (4) L'IA n'est exploitée nulle part (suggestions, planning auto, aide à la saisie). (5) Pas de "Habituels" — on repasse les mêmes articles chaque semaine manuellement.
- **Alternatives existantes** : UI native Mealie (référence), Paprika, Plan to Eat, Eat This Much, applications de meal planning mobiles. Solutions manuelles : papier + tableur.
- **Pourquoi ce projet plutôt qu'une alternative** : Bonap se branche sur Mealie (récupère toutes les recettes déjà saisies + référentiels), ne réinvente pas le backend, et apporte une couche ergonomique + IA que Mealie n'a pas. C'est un "front premium" sur un backend self-hosted maîtrisé par l'utilisateur.

## 4. Parcours utilisateur

1. **Découverte** : L'utilisateur a déjà Mealie installé. Il découvre Bonap via la communauté Mealie (GitHub, Discord, Reddit r/selfhosted), via un article, ou en cherchant "better Mealie UI".
2. **Premier accès** : L'utilisateur clone le dépôt, `npm install && npm run dev`, saisit `VITE_MEALIE_URL` + `VITE_MEALIE_TOKEN` dans `.env`. Pas d'inscription côté Bonap (l'auth est côté Mealie via le token). Pas d'onboarding à proprement parler — la première page (`/recipes`) montre immédiatement ses recettes Mealie.
3. **Activation** : Premier moment de valeur = ouvrir le Planning, ajouter 2-3 repas au calendrier, puis voir la liste de courses "Bonap" se peupler automatiquement via le bouton "Ajouter au panier" d'une recette du planning.
4. **Valeur perçue** : Au bout d'une semaine d'usage : le planning hebdo est clair, les restes sont visibles, la liste "Habituels" fait gagner du temps, les stats montrent les tendances. L'assistant IA (drawer flottant) aide à trouver une recette ou à en créer une en langage naturel.

## 5. Fonctionnalités MVP

### Must-have (v1.0 — déjà livrées)

| ID | User story | Statut |
|----|------------|--------|
| F1 | En tant que parent organisateur, je veux voir une grille de recettes paginée avec filtres (recherche, catégories, tags, durée, saisons) afin de trouver rapidement une recette | Livrée |
| F2 | En tant que cuisinier, je veux consulter le détail d'une recette (ingrédients, instructions, saisons) en modal afin de cuisiner sans changer d'écran | Livrée |
| F3 | En tant que parent organisateur, je veux créer/éditer une recette (nom, description, durées, ingrédients avec autocomplete food/unit, instructions, saisons, catégories) afin de constituer mon catalogue | Livrée |
| F4 | En tant que parent organisateur, je veux planifier mes repas sur une fenêtre glissante 3/5/7 jours avec prefetch ±14j afin de visualiser la semaine sans re-fetch | Livrée |
| F5 | En tant que parent organisateur, je veux consulter des statistiques (30j/90j/12m : top recettes, top ingrédients, streak, restes, couverture catalogue) afin de comprendre mes habitudes | Livrée |
| F6 | En tant que parent organisateur, je veux gérer une liste de courses "Bonap" + une liste "Habituels" (ajout, coche, suppression, clear) afin de ne plus rien oublier en courses | Livrée |
| F7 | En tant que parent organisateur, je veux que l'ajout d'une recette au panier alimente automatiquement la liste "Bonap" avec ses ingrédients résolus (food/unit via référentiel Mealie) | Livrée |
| F8 | En tant que parent organisateur, je veux interroger un assistant IA en langage naturel (drawer flottant) pour rechercher une recette, l'ajouter au planning ou la créer | Livrée |
| F9 | En tant que parent organisateur, je veux obtenir 5 suggestions de recettes IA basées sur critères prédéfinis + texte libre afin de débloquer ma décision "qu'est-ce qu'on mange ce soir" | Livrée |
| F10 | En tant qu'admin, je veux configurer le fournisseur LLM (Anthropic/OpenAI/Google/Mistral/Perplexity/OpenRouter/OpenCode Zen/OpenCode Go/Ollama) + clé API + modèle dans une page Settings afin de basculer sans recompiler | Livrée |
| F11 | En tant qu'utilisateur, je veux basculer le thème (light/dark/system) et choisir une couleur d'accent parmi 8 oklch afin de personnaliser l'interface | Livrée |
| F12 | En tant que parent organisateur, je veux que les saisons s'affichent comme badges colorés et qu'elles soient filtrables afin de cuisiner de saison | Livrée |

### Hors périmètre v1.0 (anti scope-creep) — reportées en v1.1 / v2.0

| ID | Fonctionnalité | Raison de l'exclusion |
|----|----------------|------------------------|
| H1 | PWA / offline | v1.0 = web responsive ; le mode offline complet demande un service worker + cache stratégie — reporté en v1.1 (usage cuisine mobile) |
| H2 | Import de recette depuis URL (scrape) | Mealie natif le fait déjà côté backend (`/api/recipes/scrape-url`) ; exposer ce flow côté Bonap est utile mais n'est pas différenciant — v1.1 |
| H3 | Planning auto IA | Trop complexe pour v1.0 (nécessite profil préférences + historique + prompt structurant) — v2.0 |
| H4 | Nutrition (macros/calories par recette et par semaine) | Mealie n'expose pas nativement la nutrition ; nécessite un service tiers ou une base locale — v2.0 |
| H5 | Export PDF (menu hebdo + liste de courses) | Nice-to-have pour cuisine papier — v1.1 |
| H6 | Multi-households / partage familial | Mealie gère déjà les households côté backend ; exposer le partage multi-households dans Bonap demande un UX de switch — v2.0 |
| H7 | Liens de partage publics de recettes | Pas dans le périmètre MVP — v2.0 |
| H8 | Cookbook / collections de recettes | Mealie gère les cookbooks côté backend ; exposer dans Bonap est optionnel — v2.0 |
| H9 | Notifications (rappels de repas, périmption) | Pas essentiel — v2.0 |
| H10 | i18n multi-langues | v1.0 = français ; i18n extract + traductions EN/ES en v1.1 si audience détectée |
| H11 | Tests E2E | Pas en v1.0 (priorité aux features) ; mis en place en v1.1 via skill dédié |
| H12 | Accessibilité WCAG AA | Audit à faire en v1.1 via skill dédié |

## 6. Pages / écrans

| Page | Description courte |
|------|---------------------|
| `/recipes` | Grille paginée des recettes avec filtres (recherche, catégories, tags, durée, saisons), scroll infini 50/page |
| `/recipes/new` | Formulaire de création de recette (saisonnalité, ingrédients, instructions, image) |
| `/recipes/:slug/edit` | Formulaire d'édition de recette (pré-rempli, même formulaire que création) |
| `/recipes/:slug` | Détail d'une recette (ingrédients, instructions, saisons, catégories) |
| `/planning` | Calendrier planning (fenêtre glissante 3/5/7 jours, navigation, ajout/suppression repas, prefetch ±14j) |
| `/stats` | Statistiques (30j/90j/12m) : top recettes, top ingrédients, streak, restes, couverture catalogue |
| `/shopping` | Liste de courses "Bonap" + liste "Habituels", groupement par label, optimistic updates |
| `/suggestions` | Suggestions IA (critères prédéfinis + texte libre → 5 suggestions via LLM) |
| `/settings` | Configuration LLM (provider + clé + modèle + température), thème, couleur d'accent |

**Composants transverses** :
- `Layout` (shell avec sidebar desktop + bottom bar mobile + outlet)
- `Sidebar` (navigation latérale)
- `AssistantDrawer` (drawer flottant IA avec tools `search_recipe`, `add_to_planning`, `create_recipe`)
- `RecipeCard`, `RecipeDetailModal`, `RecipeFormDialog`, `RecipePickerDialog`, `SeasonBadge`, `Autocomplete`

## 7. Modèle de données minimal

Bonap ne possède pas de BDD propre. Toutes les données sont dans Mealie, exposées via son API REST. Bonap maintient uniquement :

| Entité | Champs clés | Stockage |
|--------|-------------|----------|
| `MealieRecipe` | id, slug, name, description, image, recipeCategory, tags, prepTime, performTime, recipeIngredient, recipeInstructions, extras | Mealie (via `/api/recipes`) |
| `MealieMealPlan` | id, date, entryType, title, recipeId, recipe | Mealie (via `/api/households/mealplans`) |
| `MealieShoppingItem` | id, shoppingListId, checked, position, isFood, note, quantity, unitName, foodName, label, display, recipeNames, source | Mealie (via `/api/households/shopping/items`) |
| `MealieShoppingList` | id, name, labels | Mealie (via `/api/households/shopping/lists`) |
| `MealieFood` / `MealieUnit` / `MealieCategory` / `MealieTag` | référentiels organizer | Mealie (via `/api/foods`, `/api/units`, `/api/organizers/*`) |

**Persistance locale Bonap** (localStorage) :
- `bonap:food_labels` — mapping `food_key → labelId` (pré-assignation automatique des labels shopping)
- `bonap_llm_config` — config LLM (provider, clé, modèle, température)
- `bonap_theme` — thème (light/dark/system)
- `bonap_accent` — couleur d'accent (oklch)

**Pas de médias stockés par Bonap** : les images recettes sont proxifiées depuis Mealie (`/api/media/recipes/:id/images/min-original.webp`).

## 8. Intégrations externes

| Intégration | Usage | Niveau de risque |
|------------|-------|------------------|
| **Mealie API** | Backend unique : recettes, planning, shopping lists, référentiels organizer. Auth Bearer token. | Faible (self-hosted, maîtrisé par l'utilisateur) |
| **Anthropic API** (Messages + tool use + streaming) | Assistant IA principal (drawer) + suggestions IA | Moyen (payant, quota, clé utilisateur à fournir) |
| **OpenAI / Google / Mistral / Perplexity / OpenRouter APIs** | Fallbacks LLM non-streaming sans tool use (suggestions IA, chat assistant) | Moyen (payant, clés utilisateur, compatibilité variable) |
| **OpenCode Zen / OpenCode Go** | Fallbacks low-cost / multi-modèles open (MiniMax, Qwen, GLM, Kimi, DeepSeek) | Moyen (payant, CORS à proxifier) |
| **Ollama** (local) | Fallback LLM local sans frais | Faible (local, pas de quota) |
| **Vite dev proxy** | En dev : proxy `/api` → Mealie, `/anthropic` → api.anthropic.com, `/openai` → api.openai.com, `/google-ai` → generativelanguage.googleapis.com, `/api/opencode` → opencode.ai/zen, `/api/opencode-go` → opencode.ai/zen/go (contournement CORS) | Faible (dev uniquement) |

> Risque Élevé = API payante, quota restrictif, ou peu documentée. Aucune intégration Bonap n'est en risque Élevé car toutes les clés API sont fournies par l'utilisateur final dans Settings (pas de coût plateforme).

## 9. Contraintes

- **Budget temps** : ~8h/semaine en moyenne, mais variable / irrégulier. Sprints courts (1 semaine glissante), pas de dates critiques rigides, releases glissantes.
- **Stack technique** : React 19, TypeScript 5.9 strict, Vite 8, Tailwind CSS v4 (plugin Vite `@tailwindcss/vite`), React Router v7 (sans file-based routing), shadcn/ui (Radix UI + Tailwind), `lucide-react`, `react-markdown`. Pas de React Query, pas de Zustand, pas de Redux — état géré via `useState`/`useCallback`/`useRef` dans hooks custom. Architecture DDD (domain / application / infrastructure / presentation / shared). Backend imposé : Mealie self-hosted.
- **Exécution** : Utilisateur solo (supervision + validation) + Claude Code + sous-agents IA spécialisés créés via skill-creator en local pour ce projet. Pas d'équipe humaine.
- **Conformité / réglementaire** : Pas de contrainte RGPD spécifique côté Bonap (les données utilisateurs restent dans Mealie, géré par l'utilisateur). Pas de secteur régulé. Hébergement laissé au choix de l'utilisateur (self-hosted).
- **Compatibilité Mealie** : Suivre les quirks API Mealie (DELETE shopping items avec `&` final, POST recipe qui retourne string ou `{slug}`, PUT shopping items qui peut retourner `null`, tags saison préfixe `saison-`).

## 10. Jalons

> Estimations en heures à 8h/semaine. v1.0 déjà livrée — jalons ci-dessous = phase de cadrage pour v1.1 / v2.0. Le planning détaillé sera produit dans ROADMAP + MVP-EXEC.

| Jalon | Description | Estimation (heures) |
|-------|-------------|----------------------|
| J1 | Cadrage produit (ce document MVP-SCOPE) | 2 |
| J2 | Architecture technique (PDL) | 4 |
| J3 | Méthodologie SDLC | 3 |
| J4 | Roadmap v1.1 / v2.0 | 3 |
| J5 | Plan d'exécution MVP-EXEC (sprints + tickets) | 3 |
| J6 | Génération CLAUDE.md ultra-optimisé | 1 |
| **Total cadrage** | | **16 h** |
| J7 | Mise en place tests E2E (Playwright + skill e2e-test-gen) | 8 |
| J8 | PWA / offline (service worker + cache stratégie) | 12 |
| J9 | Import URL de recette (bridge vers `/api/recipes/scrape-url` Mealie) | 4 |
| J10 | Export PDF (menu hebdo + liste de courses) | 6 |
| J11 | i18n extract + traductions EN | 6 |
| J12 | Audit accessibilité WCAG AA + corrections | 8 |
| **Total v1.1** | | **44 h** (~5-6 semaines à 8h/sem.) |
| J13 | Planning auto IA (profil préférences + prompt structurant + historique) | 16 |
| J14 | Nutrition (intégration base macros/calories + affichage recette + semaine) | 12 |
| J15 | Multi-households / partage familial (switch + gestion invitations) | 10 |
| J16 | Liens de partage publics de recettes | 6 |
| J17 | Cookbook / collections | 8 |
| **Total v2.0** | | **52 h** (~6-7 semaines à 8h/sem.) |

> Total v1.1 + v2.0 = ~96 h ≈ 12 semaines à 8h/sem. = ~3 mois, avec marges pour les semaines irrégulières, étaler sur ~5-6 mois calendaires.

## 11. Critères de succès mesurables

| Indicateur | Cible | Mesure |
|------------|-------|--------|
| Rétention J7 (utilisateur revient dans la semaine) | ≥ 60% | Compteur d'ouvertures de session par utilisateur (via localStorage last-seen, ou analytics opt-in) |
| Rétention J30 | ≥ 35% | Idem J7 sur 30 jours |
| Taux d'usage du planning hebdo | ≥ 70% des sessions actives consultent `/planning` au moins 1x/semaine | Analytics page views |
| Taux d'usage de la liste de courses | ≥ 50% des sessions actives cochent au moins 1 item / semaine | Compteur d'opérations shopping |
| Adoption assistant IA | ≥ 20% des utilisateurs actifs ont ouvert le drawer IA au moins 1x | Compteur d'ouvertures AssistantDrawer |
| Conversion "recette ajoutée au planning via suggestions IA" | ≥ 10% des suggestions affichées sont ajoutées au planning | Compteur de clicks "Ajouter au planning" depuis /suggestions |
| Couverture de tests E2E (v1.1) | ≥ 80% des parcours critiques couverts (recipes, planning, shopping, suggestions, settings) | Rapport Playwright |
| Performance Lighthouse (v1.1) | ≥ 90 sur mobile (LCP < 2.5s, CLS < 0.1) | Lighthouse CI |
| Accessibilité (v1.1) | Conformité WCAG AA sur les parcours critiques | Audit axe-core |
| Adoption PWA installée (v1.1) | ≥ 30% des utilisateurs mobiles installent la PWA | Compteur beforeinstallprompt |

## 12. Definition of Done & questions ouvertes

### Definition of Done (v1.0 — déjà atteinte)

- [x] Application déployable en self-hosted (build Vite + servable derrière nginx)
- [x] Toutes les pages MVP accessibles (recipes, planning, shopping, stats, suggestions, settings)
- [x] Auth Mealie via token fonctionnelle en dev (proxy Vite) et prod (accès direct)
- [x] Assistant IA opérationnel avec Anthropic streaming + tool use (search_recipe, add_to_planning, create_recipe)
- [x] Fallbacks LLM fonctionnels pour 8 providers
- [x] Thème light/dark/system + 8 couleurs d'accent
- [x] Documentation technique CLAUDE.md complète

### Definition of Done (v1.1 — cible)

- [ ] PWA installable + offline (parcours critique consultable sans réseau)
- [ ] Import URL de recette fonctionnel (bridge Mealie scrape-url)
- [ ] Export PDF menu hebdo + liste de courses
- [ ] i18n EN/FR avec switch langue dans Settings
- [ ] Audit accessibilité WCAG AA sur parcours critiques + corrections
- [ ] Tests E2E Playwright couvrent les parcours critiques
- [ ] Lighthouse mobile ≥ 90

### Definition of Done (v2.0 — cible)

- [ ] Planning auto IA opérationnel (génère une semaine complète à partir de préférences + historique)
- [ ] Nutrition affichée par recette et agrégée par semaine
- [ ] Multi-households / partage familial opérationnel (switch + invitations)
- [ ] Liens de partage publics de recettes
- [ ] Cookbook / collections

### Questions ouvertes (hypothèses à valider post-lancement)

- Q1 : Les utilisateurs self-hosted Mealie cherchent-ils réellement un front alternatif, ou est-ce que l'UI native suffit dans la majorité des cas ? (Validation : adoption organique via communauté Mealie)
- Q2 : Le mode offline PWA est-il un vrai besoin (usage cuisine mobile) ou un nice-to-have ? (Validation : tracking des tentatives d'installation PWA + retours utilisateurs)
- Q3 : Le multi-households est-il nécessaire au-delà d'une famille unique, ou est-ce que les familles utilisent déjà le mécanisme Mealie natif ? (Validation : demandes utilisateurs + usage des households côté Mealie)
- Q4 : Quelle est la répartition entre Anthropic (streaming + tools) et les autres providers LLM en pratique ? Si Anthropic domine massivement, optimiser ce parcours en priorité.
- Q5 : L'audience est-elle suffisamment internationale pour justifier i18n EN, ou faut-il rester FR uniquement ? (Validation : analytics géographique opt-in)
- Q6 : Faut-il un service nutrition tiers (payant) ou une base locale ? Trade-off coût vs richesse.
- Q7 : Un mode "partage public" de recettes nécessite-t-il une page publique non-authentifiée, ou bienMealie expose-t-il déjà ce mécanisme à exploiter ?
- Q8 : Vaut-il mieux pousser PWA / offline avant ou après l'import URL ? Ordre dépend des retours utilisateurs prioritaires.

## 13. Skills spécialisés à créer (skill-creator)

> Skills IA à créer en local via skill-creator pour exécuter ce projet. Un skill par domaine technique reproductible.

### Skill : `e2e-test-gen`

**Prompt à fournir à skill-creator** :

```
Utilise le skill skill-creator pour créer un skill nommé "e2e-test-gen".

Description : Génère des tests E2E Playwright pour les pages et parcours critiques de Bonap. Déclenche quand l'utilisateur dit "génère des tests E2E pour [page]", "ajoute un test Playwright pour [parcours]", "couvre [feature] en E2E".

Processus attendu :
1. Identifier la page/parcours à tester (Recipes, Planning, Shopping, Suggestions, Settings, AssistantDrawer, RecipeForm).
2. Lire la page React correspondante dans src/presentation/pages/ et le hook associé dans src/presentation/hooks/.
3. Identifier les selectors stables (préférer data-testid à rajouter si manquants, sinon role+name).
4. Générer un fichier e2e/{feature}.spec.ts avec : navigation initiale, actions clés, assertions sur le DOM, gestion du mock Mealie (via MSW ou intercept Playwright).
5. Ajouter le test au projet Playwright existant (playwright.config.ts déjà en place).
6. Lancer `npx playwright test e2e/{feature}.spec.ts --reporter=list` et itérer jusqu'à passage.

allowed-tools : Read, Write, Bash, Edit, Grep, Glob

Le skill doit inclure :
- references/bonap-e2e-conventions.md (sélecteurs stables par page, patterns d'assertion, mock Mealie via MSW ou page.route)
- references/critical-paths.md (parcours critiques à couvrir en priorité : add-recipe-to-planning, shopping-add-from-recipe, suggestions-add-to-planning, settings-switch-provider, theme-switch)

Règles :
- Pas de `page.waitForTimeout` arbitraire — utiliser `page.waitForResponse` ou `getByRole` avec timeout explicite.
- Toujours mocker l'API Mealie (ne pas dépendre d'une instance réelle en CI).
- Préfixer les sélecteurs stables par `data-testid` quand le composant le permet.
- Une spec par parcours critique (pas un god-test).

Sortie : e2e/{feature}.spec.ts dans le dépôt Bonap, exécutable via `npx playwright test e2e/{feature}.spec.ts`.
```

### Skill : `recipe-migration`

**Prompt à fournir à skill-creator** :

```
Utilise le skill skill-creator pour créer un skill nommé "recipe-migration".

Description : Migre des recettes depuis d'autres formats (Paprika export JSON, Mealie JSON, Marmiton scraping, texte libre structuré) vers le format Mealie via l'API Bonap/Mealie. Déclenche quand l'utilisateur dit "importe mes recettes Paprika", "convertis ce JSON Mealie", "migrer ce livre de recettes".

Processus attendu :
1. Identifier le format source (Paprika, Mealie JSON, texte, etc.).
2. Parser le fichier source et normaliser vers le type MealieRecipe (gérer les champs manquants).
3. Pour chaque recette : POST /api/recipes { name } → récupérer slug.
4. PATCH /api/recipes/:slug avec les champs normalisés (recipeIngredient, recipeInstructions, prepTime/performTime en ISO 8601, tags, recipeCategory).
5. Si image : upload via PUT /api/recipes/:slug/image (multipart).
6. Rapport final : X créées, Y en erreur (avec détails), Z doublons ignorés.

allowed-tools : Read, Write, Bash, WebFetch, Grep, Glob

Le skill doit inclure :
- references/source-formats.md (schémas des formats source supportés : Paprika, Mealie JSON, Marmiton HTML, texte libre)
- references/normalization-rules.md (mapping champs source → MealieRecipe, gestion des unités, résolution des foods via /api/foods)

Règles :
- Idempotence : ne pas recréer une recette existant déjà (vérifier par nom via GET /api/recipes?search=).
- Ne pas créer les unités (lookup uniquement), créer les foods manquants via POST /api/foods.
- Préserver les saisons via tags `saison-{hiver|printemps|ete|automne}`.

Sortie : rapport markdown récapitulant la migration (réussites/erreurs) + écriture du log dans logs/migration-{timestamp}.md.
```

### Skill : `scaffold-ddd-feature`

**Prompt à fournir à skill-creator** :

```
Utilise le skill skill-creator pour créer un skill nommé "scaffold-ddd-feature".

Description : Scaffolde un nouveau domaine DDD Bonap complet (entity, repository interface + implémentation Mealie, use case, hook, page, route). Déclenche quand l'utilisateur dit "ajoute un domaine [X]", "scaffold une nouvelle feature DDD [X]", "crée le CRUD pour [entité]".

Processus attendu :
1. Demander le nom du domaine (ex : "cookbooks") et l'entité principale (ex : "Cookbook").
2. Créer src/domain/{domaine}/entities/{Entity}.ts (type pur).
3. Créer src/domain/{domaine}/repositories/I{Entity}Repository.ts (interface).
4. Créer src/application/{domaine}/usecases/Get{Entity}UseCase.ts, Create{Entity}UseCase.ts, Update{Entity}UseCase.ts, Delete{Entity}UseCase.ts.
5. Créer src/infrastructure/mealie/repositories/{Entity}Repository.ts (implémentation Mealie).
6. Enregistrer les singletons dans src/infrastructure/container.ts.
7. Créer src/presentation/hooks/use{Entity}s.ts (list) et use{Entity}(id).ts (détail + mutations).
8. Créer src/presentation/pages/{Entity}sPage.tsx (+ form + detail si pertinent).
9. Ajouter la route dans App.tsx + l'entrée Sidebar.

allowed-tools : Read, Write, Edit, Grep, Glob

Le skill doit inclure :
- references/ddd-template.md (gabarits de fichiers à générer : entity, repository interface, use case, repo impl, hook, page)
- references/container-pattern.md (où ajouter les singletons dans container.ts, ordre et conventions)

Règles :
- TypeScript strict, pas de `any`.
- Pas de default export (sauf App.tsx et main.tsx).
- Les hooks importent depuis container.ts, jamais depuis le repo directement.
- Optimistic updates pour les mutations toggle/delete (suivre pattern useShopping).

Sortie : fichiers créés dans src/domain/{domaine}/, src/application/{domaine}/, src/infrastructure/mealie/repositories/, src/presentation/hooks/, src/presentation/pages/ ; modifications dans container.ts et App.tsx.
```

### Skill : `i18n-extract`

**Prompt à fournir à skill-creator** :

```
Utilise le skill skill-creator pour créer un skill nommé "i18n-extract".

Description : Extrait les chaînes affichées (JSX text, props placeholder/label/aria-label, messages d'erreur, titres) des composants React Bonap et génère un fichier de traductions structuré (FR de base + placeholders EN/ES). Déclenche quand l'utilisateur dit "internationalise [page]", "extrait les strings à traduire", "prépare le i18n de Bonap".

Processus attendu :
1. Identifier le périmètre (un composant, une page, ou tout src/presentation/).
2. Parcourir les JSX, extraire les chaînes littérales affichées (texte entre > <, attributs placeholder/label/aria-label/title/alt).
3. Ignorer les chaînes non affichées (clés d'objet, noms de classe CSS, noms de variables).
4. Générer un namespace i18n par page/composant (ex : "recipes.page_title").
5. Remplacer les chaînes par des appels `t('namespace.key')` (adopter react-i18next).
6. Écrire src/i18n/locales/fr.json (avec les chaînes originales) + src/i18n/locales/en.json (avec placeholders à traduire).
7. Mettre en place src/i18n/config.ts (init i18next + react-i18next).

allowed-tools : Read, Write, Edit, Grep, Glob

Le skill doit inclure :
- references/i18n-conventions.md (namespace par page, nommage clés, gestion du pluriel, interpolation, contexte cuisson/famille)
- references/extraction-rules.md (quoi extraire vs ignorer, patterns regex à utiliser)

Règles :
- Ne pas extraire les chaînes de log technique.
- Préserver les interpolations JSX ({variable} dans le JSX → {{variable}} dans i18n).
- Namespace par fonctionnalité, pas par fichier, pour limiter le nombre de clés.

Sortie : src/i18n/locales/fr.json + src/i18n/locales/en.json + src/i18n/config.ts ; modifications dans les composants pour utiliser t().
```

### Skill : `accessibility-audit`

**Prompt à fournir à skill-creator** :

```
Utilise le skill skill-creator pour créer un skill nommé "accessibility-audit".

Description : Audite l'accessibilité (WCAG AA) des pages Bonap via axe-core + analyse manuelle des composants Radix. Déclenche quand l'utilisateur dit "audite l'accessibilité de [page]", "vérifie WCAG sur [composant]", "corrige les problèmes a11y".

Processus attendu :
1. Identifier le périmètre (page ou composant).
2. Lancer axe-core via Playwright sur la page (ou sur un composant isolé dans Storybook si pertinent).
3. Analyser les violations : contrastes, focus management, aria-labels, role, tab order, landmarks.
4. Vérifier spécifiquement les patterns shadcn/ui (Dialog, Autocomplete, DropdownMenu) pour le piège de focus et le restore-focus.
5. Générer un rapport avec priorité (critique / sérieux / mineur) + suggestion de correction concrète.
6. Pour chaque correction : appliquer le fix (aria-label, role, focus management) ou ouvrir un ticket.

allowed-tools : Read, Write, Edit, Bash, Grep, Glob

Le skill doit inclure :
- references/wcag-aa-checklist.md (critères WCAG AA applicables à Bonap : contrastes, focus visible, navigation clavier, landmarks, formulaires, ARIA)
- references/radix-patterns.md (patterns d'accessibilité pour les composants Radix utilisés : Dialog, DropdownMenu, Autocomplete, Dialog Modal)
- references/axe-cli.md (commandes axe-core via Playwright, configuration)

Règles :
- Toute modal doit piéger le focus et le restaurer à la fermeture.
- Tout champ doit avoir un label associé (Label de shadcn/ui).
- Tout bouton icon-only doit avoir un aria-label.
- Contraste minimum 4.5:1 sur texte normal, 3:1 sur gros texte.

Sortie : docs/accessibility-audit-{date}.md (rapport + recommandations) + modifications des composants pour les corrections critiques.
```

### Skill : `performance-audit`

**Prompt à fournir à skill-creator** :

```
Utilise le skill skill-creator pour créer un skill nommé "performance-audit".

Description : Audite les performances Bonap (bundle size, lazy loading, prefetch, LCP, CLS, INP) via Lighthouse + Vite bundle analyzer. Déclenche quand l'utilisateur dit "audite les perfs de Bonap", "pourquoi le bundle est gros", "optimise le LCP".

Processus attendu :
1. Lancer `npm run build` + `vite-bundle-visualizer` pour identifier les chunks lourds.
2. Lancer Lighthouse CI sur les pages critiques (/recipes, /planning, /shopping) en mobile + desktop.
3. Identifier : imports non-lazy, gros dépendances (react-markdown, lucide-react tree-shaking), images non-optimisées, requêtes API en série.
4. Recommander : React.lazy pour pages non-critiques, dynamic import pour RecipeDetailModal/RecipeFormDialog, prefetch planning ±14j, mise en cache des images via service worker.
5. Générer un rapport prioritisé (impact estimé + effort).

allowed-tools : Read, Write, Bash, Grep, Glob

Le skill doit inclure :
- references/lighthouse-targets.md (cibles Lighthouse Bonap : LCP < 2.5s, CLS < 0.1, INP < 200ms, JS bundle < 250 KB gzip)
- references/optimization-patterns.md (lazy load routes, dynamic import composants lourds, prefetch planning, image optimization)

Règles :
- Toute page non-critique doit être React.lazy + Suspense.
- Pas d'import barrel `import { X } from 'lucide-react'` — préférer `import X from 'lucide-react/dist/esm/icons/x'` si tree-shaking insuffisant.
- Mesurer avant/après pour quantifier le gain.

Sortie : docs/performance-audit-{date}.md (rapport Lighthouse + bundle analysis + recommandations priorisées).
```

## 14. MCP spécialisés à créer / installer

> MCP (Model Context Protocol) custom à développer + MCP existants à installer pour outiller Claude Code sur ce projet.

### MCP custom à développer

#### MCP : `mealie-api`

**Rôle** : Exposer l'API Mealie à Claude Code pour debug, recherche, analyse de données, et actions en lecture/écriture. Utile quand l'utilisateur demande "quelles recettes ont le tag saison-ete", "montre-moi le planning de cette semaine", "vérifie que la liste Bonap contient X", "cherche les foods qui n'ont pas de label".

**Spec d'implémentation** :

- **Transport** : stdio (local, Node.js)
- **Langage** : TypeScript (`@modelcontextprotocol/sdk`)
- **Auth** : Bearer token (env `MEALIE_TOKEN` + `MEALIE_URL` à passer en config)
- **Dépendances externes** : instance Mealie en cours (URL + token fournis par l'utilisateur via env)

**Outils exposés (tools)** :

| Nom | Description | Entrée (schéma JSON) | Sortie |
|-----|-------------|----------------------|--------|
| `search_recipes` | Recherche paginée de recettes | `{ "query"?: string, "categories"?: string[], "tags"?: string[], "max_total_time"?: number, "page"?: number, "per_page"?: number }` | `{ "items": MealieRecipe[], "total": number, "page": number, "per_page": number }` |
| `get_recipe` | Détail d'une recette par slug | `{ "slug": "string" }` | `{ "recipe": MealieRecipe }` |
| `create_recipe` | Crée une recette minimale (retourne slug) | `{ "name": "string" }` | `{ "slug": "string" }` |
| `update_recipe` | Met à jour une recette (PATCH) | `{ "slug": "string", "data": "Partial<MealieRecipe>" }` | `{ "recipe": MealieRecipe }` |
| `list_planning` | Récupère le planning sur une plage | `{ "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD" }` | `{ "items": MealieMealPlan[] }` |
| `add_meal` | Ajoute un repas au planning | `{ "date": "YYYY-MM-DD", "entry_type": "lunch\|dinner", "recipe_id": "string" }` | `{ "meal": MealieMealPlan }` |
| `delete_meal` | Supprime un repas | `{ "id": "number" }` | `{ "ok": true }` |
| `get_shopping_list` | Items + labels d'une liste | `{ "list_id": "string" }` | `{ "items": MealieShoppingItem[], "labels": ShoppingLabel[] }` |
| `get_or_create_list` | Récupère ou crée une liste par nom | `{ "name": "string" }` | `{ "list": MealieShoppingList }` |
| `add_shopping_items` | Ajout bulk d'items | `{ "list_id": "string", "items": "Array<..." }` | `{ "items": MealieShoppingItem[] }` |
| `delete_shopping_items` | Suppression multi-IDs (avec `&` final) | `{ "ids": "string[]" }` | `{ "ok": true }` |
| `list_categories` / `list_tags` / `list_foods` / `list_units` | Listes des référentiels organizer | `{}` | `{ "items": ...[] }` |
| `create_food` | Crée un aliment | `{ "name": "string" }` | `{ "food": MealieFood }` |
| `get_recipe_image_url` | URL d'image recette (proxiéée) | `{ "id": "string" }` | `{ "url": "string" }` |

**Ressources exposées (resources)** :

| URI | Description | MIME type |
|-----|-------------|-----------|
| `mealie://recipe/{slug}` | Détail d'une recette | application/json |
| `mealie://planning/{date}` | Repas planifiés pour une date donnée | application/json |
| `mealie://shopping/list/{name}` | Items d'une liste par nom | application/json |
| `mealie://categories` | Liste des catégories | application/json |
| `mealie://tags` | Liste des tags | application/json |
| `mealie://foods` | Liste des aliments (tous, page=1&perPage=-1) | application/json |
| `mealie://units` | Liste des unités | application/json |

**Prompts exposés (templates)** (optionnel) :

| Nom | Description | Variables |
|-----|-------------|-----------|
| `analyze_week` | Analyse le planning d'une semaine (restes, équilibre catégories, manquants) | `{ "start_date": "..." }` |
| `suggest_meal` | Suggère 5 recettes par critères (saison, durée max, catégories) | `{ "season": "...", "max_time": 30, "categories": [] }` |
| `shopping_summary` | Résume la liste de courses par rayon (label) | `{ "list_id": "..." }` |

**Commande d'installation** :

```bash
claude mcp add mealie-api -- node /home/zephus/Projets/bonap/mcp/mealie-api/server.js
```

> L'implémentation ira dans `mcp/mealie-api/` (server.ts + package.json + build). Variables d'env requises au lancement : `MEALIE_URL`, `MEALIE_TOKEN`. À noter : ce MCP réutilise la logique de `MealieApiClient` déjà présente dans `src/infrastructure/mealie/api/` — possibilité de shared-core ou de copier le client en l'exportant.

### MCP existants à installer

| MCP | Commande d'installation | Justification |
|-----|--------------------------|---------------|
| Playwright MCP | `claude mcp add playwright -- npx -y @playwright/mcp-server` | Pilotage Playwright depuis Claude pour tests E2E, captures d'écran de pages Bonap, vérification visuelle après modifications |
| Context7 MCP | `claude mcp add context7 -- npx -y @upstash/context7-mcp` | Récupération de doc libs à jour (React 19, Radix UI, Vite 8, Tailwind v4, React Router v7) pendant l'implémentation |
| GitHub MCP | `claude mcp add github -- npx -y @modelcontextprotocol/server-github` | Gestion de PRs, reviews, issues pour le workflow de contribution solo |
| Filesystem MCP | `claude mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem /home/zephus/Projets/bonap` | Accès étendu aux fichiers du projet (recherche, lecture/écriture hors cwd) |
| Sentry MCP (optionnel, v1.1+) | `claude mcp add sentry -- npx -y @sentry/mcp-server` | Observabilité erreurs en production (si self-hosted Sentry ou sentry.io) |
| Sequential Thinking MCP | `claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking` | Aide au raisonnement structuré pour les tâches complexes (planning auto IA, refactoring architecture) |

### MCP déjà installés à réutiliser

| MCP | Rôle dans ce projet |
|-----|---------------------|
| (à compléter par l'utilisateur — vérifier `claude mcp list` pour les MCP déjà présents sur la machine) | |

---

## Écho de vérification

Bonap est un front-end React 19 mature (v1.0 livrée) qui se branche sur une instance Mealie self-hosted pour offrir aux familles organisées une UI ergonomique de planification de repas hebdomadaires, listes de courses "Bonap + Habituels" et statistiques d'usage — avec un assistant IA intégré (Anthropic streaming + tools) et 8 fournisseurs LLM en fallback. L'exécution cible est solo dev + Claude Code + sous-agents IA spécialisés créés via skill-creator en local, à ~8h/semaine variable, sans deadline rigide.

Le cadrage v1.0 confirme ce qui est déjà livré (12 fonctionnalités must-have). Le backlog v1.1 proposé priorise la robustesse (tests E2E, accessibilité WCAG AA), l'usage cuisine mobile (PWA/offline), l'écosystème (import URL, export PDF, i18n). Le v2.0 pousse la différenciation IA (planning auto) + les manques vs Mealie natif (nutrition, multi-households, partage public, cookbook). Six skills spécialisés sont identifiés (e2e-test-gen, recipe-migration, scaffold-ddd-feature, i18n-extract, accessibility-audit, performance-audit), plus un MCP custom `mealie-api` pour exposer Mealie à Claude en debug/recherche/actions, et 6 MCP existants (Playwright, Context7, GitHub, Filesystem, Sentry, Sequential Thinking) pour outiller le workflow.