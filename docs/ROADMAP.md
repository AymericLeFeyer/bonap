# ROADMAP — Bonap

> Version : 1.0
> Date : 2026-08-10
> Statut : Draft (pipeline orchestrateur-dev)
> Auteur : sous-agent `roadmap-creator` (étape 4/6 du pipeline orchestrateur-dev)
> Horizon temporel : 12 mois (moyen terme)
> Configuration d'exécution : Solo + Claude Code + sous-agents IA spécialisés (créés via `skill-creator` en local). Pas d'équipe humaine.

---

## 1. Référence des inputs

- **MVP-SCOPE** : `/home/zephus/Projets/bonap/docs/MVP-SCOPE.md` — scope du MVP (12 fonctionnalités must-have livrées en v1.0, fonctionnalités hors périmètre reportées en v1.1/v2.0, jalons §10, critères de succès §11, skills §13, MCP §14).
- **PDL** : `/home/zephus/Projets/bonap/docs/PDL.md` — architecture DDD 5 couches, modules fonctionnels, séquencement v1.1 (§8.2) et v2.0 (§8.3), contrats d'interface repositories, dépendances techniques, risques, skills §11, MCP §12.
- **SDLC** : `/home/zephus/Projets/bonap/docs/SDLC.md` — méthodologie Kanban-solo + sprints courts optionnels, DoR §4, DoD §5, environnements §6, gating §6.2, CI/CD §7, branches/commits §8, skills §10, MCP §11.

---

## 2. Vue d'ensemble

- **Horizon** : 12 mois (moyen terme) — du 2026-08-10 au 2027-08-10.
- **Nombre de versions** : 2 versions à livrer (v1.1, v2.0) + v1.0 déjà en production (référence).
- **Versions planifiées** : v1.0 (livrée), v1.1 (cible 2027-01), v2.0 (cible 2027-06).
- **Cadence** : Kanban-solo avec sprints courts optionnels (1 à 2 sessions par sprint court). Pas de sprint timebox rigide. Throughput cible : 1 à 3 tickets `Done` par semaine glissante sur 4 semaines. WIP limit = 2.
- **Disponibilité de l'utilisateur** : ~8h/semaine en moyenne, variable / irrégulier. Sprints courts de 1 semaine glissante. Marges incluses pour semaines à 0h (imprévus, vacances).
- **Configuration d'exécution** : utilisateur solo (supervision + validation + déploiement HA addon) + Claude Code (implémentation, tests, revue assistée) + sous-agents IA spécialisés créés via `skill-creator` en local (`code-review`, `commit-helper`, `branch-naming`, `e2e-test-gen`, `accessibility-audit`, `performance-audit`, `scaffold-ddd-feature`, `i18n-extract`, `pwa-offline-setup`, `pdf-export-builder`, `tech-debt-audit`, et spécifiques roadmap `planning-ia-gen`, `nutrition-integration`).
- **Stratégie de release** : releases glissantes (pas de deadlines rigides). Les dates ci-dessous sont des **jalons indicatifs** calibrés sur la disponibilité déclarée et les estimations PDL/MVP-SCOPE (v1.1 ~44h, v2.0 ~52h), avec marges de variance. Toute release peut glisser de ±2-4 semaines sans alerte.

---

## 3. Versions

### v1.0 — déjà livrée (référence)

**Description** : MVP de Bonap en production self-hosted (addon HA + image Docker multi-arch `ghcr.io/aymericlefeyer/bonap`). Interface React 19 se branchant sur Mealie pour recettes, planning, shopping, suggestions IA, avec assistant IA multi-provider.

**Statut** : en production, v1.3.5 courant. Maintenance corrective et évolutive légère en parallèle des versions suivantes.

**Fonctionnalités** (cross-référence MVP-SCOPE §5 — must-have livrées) :

| ID | Fonctionnalité | Module PDL |
|----|----------------|------------|
| F1 | Grille de recettes paginée avec filtres (search, catégories, tags, durée, saisons) | recipe |
| F2 | Détail recette en modal (ingrédients, instructions, saisons) | recipe |
| F3 | Création/édition recette (autocomplete food/unit, saisons, catégories) | recipe + organizer |
| F4 | Planning hebdo fenêtre glissante 3/5/7 jours + prefetch ±14j | planning |
| F5 | Statistiques (30j/90j/12m : top recettes, top ingrédients, streak, restes, couverture) | planning + recipe |
| F6 | Listes de courses "Bonap" + "Habituels" (ajout, coche, suppression, clear) | shopping |
| F7 | Ajout automatique des ingrédients recette à la liste "Bonap" (résolution food/unit) | shopping + recipe |
| F8 | Assistant IA drawer flottant (streaming Anthropic + tools search_recipe/add_to_planning/create_recipe) | assistant (LLM) |
| F9 | 5 suggestions IA par critères + texte libre | assistant (LLM) |
| F10 | Settings : 9 providers LLM (Anthropic, OpenAI, Google, Mistral, Perplexity, OpenRouter, OpenCode Zen, OpenCode Go, Ollama) + clé + modèle | assistant (LLM) |
| F11 | Thème light/dark/system + 8 couleurs d'accent oklch | theme |
| F12 | Saisons comme badges colorés + filtrables (tags `saison-*`) | recipe + organizer |

**Releases intermédiaires** : N/A (déjà en production). Patches v1.0.x via Dependabot et fixes ponctuels en parallèle de v1.1/v2.0.

**Critères de succès v1.0** (cross-référence MVP-SCOPE §11) :

| Indicateur | Cible | Mesure |
|------------|-------|--------|
| Rétention J7 | ≥ 60% | Compteur d'ouvertures de session (localStorage last-seen) |
| Rétention J30 | ≥ 35% | Idem J7 sur 30 jours |
| Taux d'usage planning hebdo | ≥ 70% des sessions consultent `/planning` | Analytics page views |
| Adoption assistant IA | ≥ 20% des utilisateurs actifs ont ouvert le drawer | Compteur d'ouvertures AssistantDrawer |

**Risques spécifiques v1.0** (maintenance) :

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Mealie API breaking change en prod | Élevé | Tests E2E couvrent les endpoints critiques ; versionning du `MealieApiClient` si divergence |
| Token Mealie leak côté client SPA | Moyen | Documenté dans README ; recommander token scoped à household |
| Régression v1.0 pendant features v1.1/v2.0 | Élevé | Feature flags + tests E2E couvrent v1.0 avant d'entamer v1.1 |

---

### v1.1 — cible prod 2027-01-15 (jalon indicatif)

**Description** : Version de robustesse et d'usage mobile — PWA/offline pour la cuisine, import URL pour enrichir le catalogue, export PDF pour les listes papier, i18n EN/FR pour l'audience internationale, accessibilité WCAG AA, et tests E2E couvrant v1.0 pour empêcher les régressions pendant le développement de v2.0.

**Fonctionnalités** (origines : MVP-SCOPE §5 hors périmètre + jalons §10 J7-J12) :

| ID | Fonctionnalité | Origine | Module PDL | Estimation |
|----|----------------|---------|------------|------------|
| V11-1 | Tests E2E Playwright couvrant les parcours critiques v1.0 (add-recipe-to-planning, shopping-add-from-recipe, suggestions-add-to-planning, settings-switch-provider, theme-switch) | Hors périmètre MVP-SCOPE H11, Jalon J7 | recipe + planning + shopping + assistant + theme | 8h |
| V11-2 | Audit accessibilité WCAG AA sur pages critiques + corrections (focus, aria-labels, contrastes, patterns Radix) | H12, Jalon J12 | presentation/components (transverse) | 8h |
| V11-3 | i18n extract + FR de base + EN placeholder + switch de langue dans Settings | H10, Jalon J11 | infrastructure (nouveau domaine `i18n`) | 6h |
| V11-4 | PWA installable + offline (service worker, cache stratégie, IndexedDB pour mutations offline) | H1, Jalon J8 | infrastructure (PWA) + planning + shopping | 12h |
| V11-5 | Import URL de recette (bridge vers `/api/recipes/scrape-url` Mealie) + UI bouton dans RecipesPage | H2, Jalon J9 | recipe (extension `IRecipeRepository.scrapeUrl`) | 4h |
| V11-6 | Export PDF menu hebdo + liste de courses (i18n-ready) | H5, Jalon J10 | infrastructure (nouveau service `IPdfExportService`) + planning + shopping | 6h |
| V11-7 | Audit performance Lighthouse + bundle analyzer + lazy load routes non-critiques + dynamic import composants lourds | (PDL §9.7 + SDLC §15) | presentation/pages + presentation/components | (inclus dans V11-2 et V11-4, pas jalon séparé) |
| **Total v1.1** | | | | **~44h** |

**Modules PDL concernés** :
- `recipe` (extension `IRecipeRepository` pour `scrapeUrl`)
- `planning` (export PDF menu, cache offline IndexedDB)
- `shopping` (export PDF liste, queue offline mutations)
- `infrastructure/i18n` (nouveau — `II18nService`)
- `infrastructure/pwa` (nouveau — vite-plugin-pwa + Workbox)
- `infrastructure/pdf` (nouveau — `IPdfExportService`)
- `presentation/components` (corrections a11y transverses)
- `presentation/pages` (lazy load, switch langue dans Settings, bouton import URL dans Recipes)

**Releases intermédiaires** (jalons indicatifs, marges ±2 sem) :

| Release | Date cible | Critère de sortie |
|---------|------------|-------------------|
| v1.1-alpha | 2026-11-15 | Tests E2E en place couvrent v1.0 + audit a11y terminé + i18n extraction initiale (FR de base). Features PWA/import/PDF non démarrées ou partielles. |
| v1.1-beta | 2026-12-15 | Toutes features v1.1 implémentées (PWA, import URL, export PDF, i18n EN). Tests E2E + a11y + lighthouse passent en CI. Smoke test utilisateur pilote sur instance dev. |
| v1.1-RC | 2027-01-05 | DoD du SDLC satisfaite (§5 — 18 critères). Lighthouse mobile ≥ 90, axe-core sans violation critique. Bundle < 250 KB gzip. |
| v1.1-prod | 2027-01-15 | Tag `v1.1.0` sur main, image multi-arch poussée sur ghcr, mise à jour addon HA, smoke test post-deploy sur instance prod. |

**Critères de succès v1.1** (cross-référence MVP-SCOPE §11 + SDLC §15) :

| Indicateur | Cible | Mesure |
|------------|-------|--------|
| Couverture tests E2E parcours critiques | ≥ 80% | Rapport Playwright |
| Performance Lighthouse mobile | ≥ 90 (LCP < 2.5s, CLS < 0.1, INP < 200ms) | Lighthouse CI sur `/recipes`, `/planning`, `/shopping` |
| Accessibilité | WCAG AA sur parcours critiques, 0 violation critique axe-core | Audit `@axe-core/playwright` |
| Adoption PWA installée | ≥ 30% des utilisateurs mobiles | Compteur `beforeinstallprompt` |
| Bundle size gzip | < 250 KB app | `vite-bundle-visualizer` en CI |
| Cycle time moyen (Ready → Done) | < 7 jours pour S, < 14 pour M | GitHub Project |
| Tests verts en CI sur main | 100% | GitHub Actions |

**Risques spécifiques v1.1** :

| Risque | Impact | Mitigation |
|--------|--------|------------|
| PWA offline mal testée (sync conflict, perte données) | Moyen | IndexedDB queue avec ID stable ; replay idempotent ; tests E2E offline via Playwright `context.setOffline(true)` |
| i18n extraction manquée (chaînes oubliées) | Faible | Skill `i18n-extract` (regex + revue manuelle) + test visuel post-traduction ; à relancer incrémentalement sur nouvelles pages |
| Bundle explose avec deps PWA/PDF/i18n | Moyen | Skill `performance-audit` + job Lighthouse CI + check bundle-size sur PR ; `pdf-lib` (~70 KB gzip) à justifier |
| Régression v1.0 pendant features v1.1 | Élevé | Tests E2E couvrent v1.0 **avant** d'entamer features v1.1 (V11-1 en premier) + feature flags pour tout ce qui touche au code v1.0 |
| Anthropic-only streaming + tool use pendant v1.1 | Faible | Documenté dans Settings ; fallback single-turn sans tools pour les autres 8 providers |

---

### v2.0 — cible prod 2027-06-30 (jalon indicatif)

**Description** : Version de différenciation IA et de couverture des manques vs Mealie natif — planning auto IA (la feature différenciante), nutrition par recette et agrégation semaine, multi-households / partage familial, partage public de recettes par token, cookbook / collections.

**Fonctionnalités** (origines : MVP-SCOPE §5 hors périmètre + jalons §10 J13-J17) :

| ID | Fonctionnalité | Origine | Module PDL | Estimation |
|----|----------------|---------|------------|------------|
| V20-1 | Planning auto IA — génère une semaine complète à partir de préférences (saisons, durée, catégories, historique) + prompt structurant + sortie en brouillon validée par user avant POST | H3, Jalon J13 | planning (nouveau `IPlanningGeneratorService` + `IPreferencesRepository`) + assistant (LLM structurant) | 16h |
| V20-2 | Nutrition par recette + agrégation semaine (intégration base macros/calories, affichage RecipeDetailModal + StatsPage) | H4, Jalon J14 | recipe + planning + nouveau domaine `nutrition` (`INutritionService`) | 12h |
| V20-3 | Multi-households / partage familial — switch household dans Sidebar, gestion invitations, filtrage planning/shopping par household | H6, Jalon J15 | planning + shopping + nouveau domaine `household` (`IHouseholdRepository`) + `householdContext` mutable dans container | 10h |
| V20-4 | Liens de partage publics de recettes (token-based, page publique `/shared/:token` non-authentifiée) | H7, Jalon J16 | recipe + nouveau domaine `share` (`IShareRepository`) + nouvelle route publique | 6h |
| V20-5 | Cookbook / collections de recettes (page `/cookbooks`, CRUD, ajout/retrait recettes) | H8, Jalon J17 | recipe + nouveau domaine `cookbook` (`ICookbookRepository`) | 8h |
| **Total v2.0** | | | | **~52h** |

**Modules PDL concernés** :
- `planning` (extension `IPlanningGeneratorService`, `IPreferencesRepository`, type `PlannedWeek`)
- `recipe` (extension `IShareRepository.createShareLink`, `getSharedByToken`)
- `planning` + `shopping` (devenir household-aware via `householdContext` mutable)
- `nutrition` (nouveau domaine — `INutritionService`, `NutritionInfo`)
- `household` (nouveau domaine — `IHouseholdRepository`)
- `share` (nouveau domaine — `IShareRepository`)
- `cookbook` (nouveau domaine — `ICookbookRepository`)
- `presentation/pages` (nouvelles : `/preferences`, `/cookbooks`, `/shared/:token`, switch household dans Sidebar)
- `presentation/components` (composant nutrition dans RecipeDetailModal, agrégation dans StatsPage)

**Releases intermédiaires** (jalons indicatifs, marges ±3 sem — v2.0 plus incertain que v1.1 car features IA + nouveaux domaines) :

| Release | Date cible | Critère de sortie |
|---------|------------|-------------------|
| v2.0-alpha | 2027-03-15 | Planning auto IA opérationnel en brouillon (sortie LLM validée par user avant POST) + nutrition par recette fonctionnelle. Multi-households, partage, cookbook non démarrés. |
| v2.0-beta | 2027-04-30 | Multi-households (switch + invitations) + partage public de recettes implémentés. Feature flag `multiHouseholdsEnabled` en place. Tests E2E couvrent les nouveaux parcours. |
| v2.0-RC | 2027-06-15 | Cookbook implémenté. DoD satisfaite sur les 5 features. Tests E2E + a11y + lighthouse toujours verts. Pas de régression v1.0/v1.1 (vérifié par feature flags désactivés). |
| v2.0-prod | 2027-06-30 | Tag `v2.0.0` sur main, image multi-arch, addon HA mis à jour, smoke test post-deploy. Feature flags `multiHouseholdsEnabled`, `nutritionEnabled`, `cookbooksEnabled` activés progressivement (opt-in Settings). |

**Critères de succès v2.0** :

| Indicateur | Cible | Mesure |
|------------|-------|--------|
| Adoption planning auto IA | ≥ 30% des utilisateurs actifs génèrent au moins 1 semaine via IA par mois | Compteur de générations |
| Taux d'acceptation des suggestions IA planning | ≥ 50% des semaines générées sont validées par l'utilisateur (POST) | Compteur validate vs regenerate |
| Adoption nutrition | ≥ 40% des utilisateurs consultent la nutrition d'au moins 1 recette | Compteur d'ouvertures panneau nutrition |
| Adoption multi-households | ≥ 10% des utilisateurs activent le multi-households | Compteur de switchs |
| Partage public | ≥ 5 liens de partage générés par utilisateur actif par mois | Compteur `createShareLink` |
| Cookbook | ≥ 20% des utilisateurs créent au moins 1 cookbook | Compteur de créations |
| Pas de régression v1.0 / v1.1 | 0 régression détectée post-deploy | Sentry + tests E2E |

**Risques spécifiques v2.0** :

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Planning auto IA génère des repas non voulus | Faible | Sortie en brouillon (pas de POST direct) ; user valide avant application ; bouton "regénérer" ; feature flag désactivé par défaut |
| Nutrition : pas de base gratuite fiable | Moyen | Évaluer Open Food Facts (gratuit, FR) vs API payante ; fallback sur saisie manuelle ; MCP `bonap-nutrition` pour itérer |
| Multi-households casse planning/shopping existants | Élevé | Feature flag `multiHouseholdsEnabled` désactivé par défaut ; tests E2E couvrent parcours single-household avant et après ; `householdContext` mutable avec valeur par défaut = household courant |
| Partage public expose des champs privés (token, clés) | Critique | Page publique `/shared/:token` non-authentifiée n'expose que les champs publics de la recette ; pas de token Mealie, pas de clés LLM ; revue sécurité par skill `code-review` |
| Anthropic-only pour tool use — planning auto IA dépend du tool use | Moyen | Prévoir fallback single-turn avec prompt structurant → JSON parse pour les 8 autres providers (parcours dégradé) |
| v2.0 dépasse l'horizon 12 mois (features IA complexes) | Moyen | Découpage fin par feature (V20-1 à V20-5 indépendantes côté roadmap), releases intermédiaires, possibilité de pousser V20-4 et V20-5 en v2.1 si besoin |

---

## 4. Dépendances inter-versions

| Depuis | Vers | Raison |
|--------|------|--------|
| v1.1 | v1.0 | v1.1 étend le code v1.0 existant (recipes, planning, shopping, settings) — tests E2E v1.1 (V11-1) protègent v1.0 des régressions pendant le dev des features v1.1 |
| v2.0 | v1.1 | v2.0 dépend des fondations v1.1 : tests E2E (sinon risque régression sur nouvelles features IA), i18n (nutrition/cookbook multilingues), PWA (multi-households sur mobile), accessibilité (nouvelles pages `/preferences`, `/cookbooks`, `/shared/:token`), performance audit (bundle à maîtriser avec 5 nouveaux domaines) |
| V20-1 (planning auto IA) | v1.1-V11-1 (tests E2E) | Le planning auto IA modifie le comportement du planning — tests E2E doivent couvrir le parcours add-recipe-to-planning **avant** d'introduire la génération IA |
| V20-2 (nutrition) | V20-1 (planning auto IA) | L'agrégation nutrition semaine s'appuie sur le planning généré — si planning auto IA livré, nutrition peut agréger le `PlannedWeek` |
| V20-3 (multi-households) | v1.1-V11-3 (i18n) | Labels des households, invitations, et messages d'erreur doivent être traduits — i18n en place en v1.1 |
| V20-3 (multi-households) | v1.1-V11-1 (tests E2E) | Multi-households modifie le comportement de `planning` et `shopping` (filtrage par household) — tests E2E protègent v1.0 single-household |
| V20-4 (partage public) | V20-3 (multi-households) | Optionnel — peut venir avant multi-households, mais le partage public doit respecter le scope household (ne pas exposer une recette d'un autre household) |
| V20-5 (cookbook) | v1.1-V11-6 (export PDF) | Cookbook peut réutiliser la techno de rendu PDF (génération PDF d'un cookbook complet) |
| v2.0 (toutes features) | v1.1 (skills code-review/commit-helper/branch-naming) | Tout ticket v2.0 passe par les skills SDLC créés en début v1.1 — ces skills doivent être opérationnels avant le démarrage v2.0 |
| v2.0-alpha | v1.1-prod | v2.0-alpha ne démarre qu'après v1.1-prod stabilisée (au moins 2 semaines de smoke test post-deploy) |

**Notes sur le parallélisme intra-version** :
- V20-4 (partage) et V20-5 (cookbook) sont indépendants — peuvent être menés en parallèle une fois V20-1 et V20-3 stabilisés.
- V20-2 (nutrition) dépend faiblement de V20-1 (peut démarrer en parallèle sur la partie "nutrition par recette" ; l'agrégation semaine attend V20-1).
- En Kanban-solo avec WIP=2, 2 features max en parallèle — les autres restent en `Ready`.

---

## 5. Calendrier global

| Version | Releases | Dates cibles (jalons indicatifs, marges ±2-3 sem) |
|---------|----------|-------|
| v1.0 | (déjà livrée — patches v1.0.x en parallèle) | En prod depuis 2026 (v1.3.5 courant) |
| v1.1 | alpha → beta → RC → prod | 2026-11-15 → 2026-12-15 → 2027-01-05 → 2027-01-15 |
| v2.0 | alpha → beta → RC → prod | 2027-03-15 → 2027-04-30 → 2027-06-15 → 2027-06-30 |

### Timeline ASCII

```
2026-08    2026-10    2026-12    2027-02    2027-04    2027-06    2027-08
  │           │          │          │          │          │          │
  ▼           ▼          ▼          ▼          ▼          ▼          ▼
  ├─ v1.0 (prod, maintenance)
  │
  ├─── v1.1 dev ────┤
  │    (44h, ~5-6 sem à 8h/sem étalées sur ~5 mois calendaires avec variance)
  │                 ├─ alpha ────┤
  │                 │             ├─ beta ──┤
  │                 │             │         ├─ RC ─┤
  │                 │             │         │      └─ prod (2027-01-15)
  │
  │                                          ├─── v2.0 dev ────────┤
  │                                          │  (52h, ~6-7 sem à 8h/sem
  │                                          │   étalées sur ~5-6 mois calendaires)
  │                                          │                      ├─ alpha ──┤
  │                                          │                      │         ├─ beta ──┤
  │                                          │                      │         │         ├─ RC ─┤
  │                                          │                      │         │         │      └─ prod (2027-06-30)
  │
  └── horizon 12 mois : 2027-08-10
```

**Lecture** : les blocs dev représentent la période de développement effective (estimations PDL/MVP-SCOPE). Les jalons alpha→beta→RC→prod sont des cibles glissantes. Toute release peut glisser de ±2-4 semaines selon la disponibilité réelle (variable) et les imprévus.

---

## 6. Indicateurs de succès par version

| Version | Indicateur | Cible | Déclenche la version suivante ? |
|---------|------------|-------|----------------------------------|
| v1.0 | Rétention J7 | ≥ 60% | Non (maintenance continue) |
| v1.0 | Rétention J30 | ≥ 35% | Non |
| v1.0 | Adoption assistant IA | ≥ 20% | Non |
| v1.1 | Couverture E2E parcours critiques | ≥ 80% | Oui — condition pour démarrer v2.0 (protège contre régressions) |
| v1.1 | Lighthouse mobile | ≥ 90 (LCP<2.5s, CLS<0.1, INP<200ms) | Oui — condition pour v2.0 (v2.0 ajoute du bundle, baseline solide requise) |
| v1.1 | Accessibilité WCAG AA parcours critiques | 0 violation critique axe-core | Oui — condition pour v2.0 (nouvelles pages v2.0 doivent partir sur base a11y saine) |
| v1.1 | Bundle size gzip | < 250 KB app | Oui — alerte si > +10% en v2.0 |
| v1.1 | Adoption PWA installée | ≥ 30% mobile | Non (indicateur produit, ne bloque pas v2.0) |
| v1.1 | Tests verts CI sur main | 100% | Oui — bloque tout merge v2.0 sinon |
| v2.0 | Adoption planning auto IA | ≥ 30% génèrent ≥ 1 sem/mois | Non (indicateur produit post-lancement) |
| v2.0 | Taux d'acceptation suggestions planning IA | ≥ 50% validées par user | Non (si < 50%, ajuster le prompt structurant — itération) |
| v2.0 | Adoption nutrition | ≥ 40% consultent nutrition | Non |
| v2.0 | Adoption multi-households | ≥ 10% activent | Non (si < 5%, envisager de désactiver le feature flag par défaut) |
| v2.0 | Pas de régression v1.0/v1.1 | 0 régression post-deploy | Oui — si régression, rollback et corrective release v2.0.x |

**Note** : les seuils "déclenche la version suivante" sont **consultatifs**. En Kanban-solo, l'utilisateur décide de démarrer v2.0 dès que v1.1-prod est stabilisée (smoke test post-deploy OK pendant 2 semaines). Les seuils E2E/Lighthouse/a11y sont en revanche **bloquants** (DoD §5 du SDLC) — sans eux, pas de tag v1.1.0.

---

## 7. Risques roadmap

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Disponibilité utilisateur réduite sur la période v2.0 (vacances, autres projets) | Moyen — v2.0 glisse au-delà de 2027-06 | Marges ±3 sem incluses dans les jalons v2.0 ; si variance > 4 sem, réviser la roadmap et envisager de pousser V20-4 et V20-5 en v2.1 |
| Anthropic API change ou augmente ses prix pendant v2.0 (planning auto IA dépend du streaming + tool use) | Moyen — feature différenciante impactée | MCP `mealie-api` pour itérer côté Mealie ; fallback single-turn pour les 8 autres providers (parcours dégradé sans tool use) ; prévoir un prompt structurant + JSON parse robuste |
| Mealie API évolue (breaking change) entre v1.1 et v2.0 | Élevé — casse plusieurs repos | Tests E2E couvrent les endpoints critiques ; versionning du `MealieApiClient` si divergence majeure ; `page.route` mocks dans les tests E2E pour ne pas dépendre d'une instance réelle |
| v2.0 dépasse l'horizon 12 mois (5 nouveaux domaines + IA + sécurité) | Moyen — roadmap à étendre | Découpage par feature indépendante (V20-1 à V20-5) ; possibilité de réorganiser les priorités après v2.0-alpha ; release glissante, pas de deadline rigide |
| Planning auto IA génère du JSON malformé (provider hors-Anthropic sans tool use) | Moyen — UX dégradée | Validation JSON Schema stricte côté `IPlanningGeneratorService` ; retry avec prompt de correction si parse échoue ; fallback sur saisie manuelle |
| Partage public de recettes (V20-4) expose unintentionnellement des données privées | Critique — sécurité | Page `/shared/:token` non-authentifiée ne expose que `MealieRecipe` champs publics (name, description, image, recipeIngredient, recipeInstructions, recipeCategory, tags, prepTime, performTime) — pas le token, pas les extras, pas les households ; revue `code-review` obligatoire sur ce ticket |
| Multi-households (V20-3) casse le parcours single-household v1.0 | Élevé — régression | Feature flag `multiHouseholdsEnabled` désactivé par défaut ; `householdContext` mutable avec valeur par défaut = household courant (comportement identique à v1.0) ; tests E2E single-household restent verts |
| Bundle explose avec 5 nouveaux domaines en v2.0 | Moyen — LCP mobile dégradé | Skill `performance-audit` relancé à la fin de chaque feature v2.0 ; lazy load des nouvelles pages (`/preferences`, `/cookbooks`, `/shared/:token`) ; dynamic import des composants nutrition et cookbook |
| Test E2E flaky en CI pendant v2.0 (nouvelles pages, async IA) | Faible — CI rouge intermittent | Retry policy Playwright (2 retries sur CI) ; identifier les flaky et fix ou skip avec justification ; tests E2E IA avec mock LLM (pas d'appel réel Anthropic en CI) |
| Token Mealie leak via page de partage public | Critique — sécurité | Page publique n'utilise jamais `VITE_MEALIE_TOKEN` (endpoint Mealie `/api/recipes/:slug/share` côté utilisateur authentifié pour créer le token, puis page publique consomme l'endpoint public Mealie) ; revue `code-review` sur ce ticket |

---

## 8. Questions ouvertes

- **Q1** : Les utilisateurs self-hosted Mealie cherchent-ils réellement un front alternatif, ou est-ce que l'UI native suffit dans la majorité des cas ? (Validation : adoption organique via communauté Mealie pendant v1.1 ; si adoption faible, réviser la priorité v2.0) — *Issue MVP-SCOPE Q1*
- **Q2** : Le mode offline PWA est-il un vrai besoin (usage cuisine mobile) ou un nice-to-have ? (Validation : tracking des tentatives d'installation PWA + retours utilisateurs pendant v1.1-beta) — *Issue MVP-SCOPE Q2*
- **Q3** : Le multi-households est-il nécessaire au-delà d'une famille unique, ou est-ce que les familles utilisent déjà le mécanisme Mealie natif ? (Validation : demandes utilisateurs + usage des households côté Mealie pendant v1.1 ; si faible, envisager de désactiver le feature flag `multiHouseholdsEnabled` par défaut en v2.0) — *Issue MVP-SCOPE Q3*
- **Q4** : Quelle est la répartition entre Anthropic (streaming + tools) et les autres providers LLM en pratique ? Si Anthropic domine massivement, optimiser le parcours planning auto IA en priorité sur Anthropic. (Validation : analytics opt-in sur `LLMConfig.provider` agrégé) — *Issue MVP-SCOPE Q4*
- **Q5** : L'audience est-elle suffisamment internationale pour justifier i18n EN, ou faut-il rester FR uniquement ? (Validation : analytics géographique opt-in pendant v1.1 ; si audience < 10% non-FR, ne pas investir dans ES/de et garder FR+EN uniquement) — *Issue MVP-SCOPE Q5*
- **Q6** : Faut-il un service nutrition tiers (payant) ou une base locale (Open Food Facts) ? Trade-off coût vs richesse. (Validation : prototype V20-2-alpha sur Open Food Facts en v2.0-alpha ; si qualité insuffisante, évaluer API payante) — *Issue MVP-SCOPE Q6*
- **Q7** : Un mode "partage public" de recettes nécessite-t-il une page publique non-authentifiée, ou bien Mealie expose-t-il déjà ce mécanisme à exploiter ? (Validation : vérifier endpoint Mealie `/api/recipes/:slug/share` et le mode "public" côté Mealie en début de V20-4) — *Issue MVP-SCOPE Q7*
- **Q8** : Vaut-il mieux pousser PWA / offline avant ou après l'import URL ? Ordre dépend des retours utilisateurs prioritaires. (Décision : PWA avant import URL, selon PDL §8.2 — PWA protège l'usage cuisine mobile qui est le cas d'usage principal) — *Issue MVP-SCOPE Q8*
- **Q9 (roadmap)** : Faut-il une v1.2 entre v1.1 et v2.0 si v1.1 génère beaucoup de bugfixs (PWA offline sync, i18n manquées, a11y corners) ? (Décision : patches v1.1.x en Kanban continu, pas de v1.2 structurée — les features v2.0 démarrent sur v1.1 stable)
- **Q10 (roadmap)** : Si v2.0 dépasse l'horizon 12 mois, faut-il pousser V20-4 (partage) et V20-5 (cookbook) en v2.1 pour libérer v2.0 sur la différenciation IA (V20-1 + V20-2) ? (Décision : à évaluer après v2.0-alpha — si alpha glisse au-delà de 2027-04, revoir la roadmap)
- **Q11 (roadmap)** : Le planning auto IA (V20-1) doit-il être derrière un paywall ou une feature gratuite ? (Décision : gratuite — Bonap est un projet self-hosted, pas de monétisation prévue ; le coût est absorbé par la clé API LLM de l'utilisateur)
- **Q12 (roadmap)** : Faut-il un mini-backend proxy en v2.0 pour masquer le `VITE_MEALIE_TOKEN` côté client (trade-off sécurité du partage public) ? (Décision : non en v2.0 — le partage public utilise le mécanisme Mealie natif ; à réévaluer si besoin de features serveur en v2.1+)

---

## 9. Skills spécialisés à créer (`skill-creator`)

> Skills IA à créer en local via `skill-creator` pour exécuter chaque version. Reprend les skills listés dans PDL §11 et SDLC §10, et précise la version à laquelle chacun est nécessaire. Ajoute les skills spécifiques identifiés pour la roadmap (V20-1 planning auto IA, V20-2 nutrition).

### Skills nécessaires dès le démarrage v1.1 (priorité immédiate)

| Skill | Rôle | Source | Versions couvertes | Prompt skill-creator |
|-------|------|--------|--------------------|----------------------|
| `code-review` | Revue de code automatisée d'une PR Bonap par sous-agent IA — 30 items sur 6 axes (qualité, sécu, a11y, perfs, conventions, tests), classification critique/majeur/mineur, ne modifie jamais le code | SDLC §10.2 | v1.1, v2.0 (toutes PR) | Voir SDLC §10.2 — prompt complet |
| `commit-helper` | Formule les commit messages au format conventional commits Bonap (type + scope + subject) | SDLC §10.2 | v1.1, v2.0 (tous commits) | Voir SDLC §10.2 |
| `branch-naming` | Nomme et crée les branches Bonap au format trunk-based (`<type>/<scope>-<descriptif>`) | SDLC §10.2 | v1.1, v2.0 (toutes branches) | Voir SDLC §10.2 |
| `e2e-test-gen` | Génère des tests Playwright pour les parcours critiques Bonap avec mock Mealie (`page.route` ou MSW) | MVP-SCOPE §13, PDL §11, SDLC §10.1 | v1.1 (couvrir v1.0 d'abord), v2.0 (nouvelles features) | Voir MVP-SCOPE §13 — prompt complet |
| `scaffold-ddd-feature` | Scaffolde l'arborescence complète d'un nouveau domaine DDD (entity → repo interface → repo impl Mealie → use cases → container.ts → hooks → pages → route) | MVP-SCOPE §13, PDL §11, SDLC §10.1 | v1.1 (i18n, pwa, pdf), v2.0 (nutrition, household, share, cookbook) | Voir MVP-SCOPE §13 — prompt complet |

### Skills nécessaires en v1.1 (ordre séquencé selon PDL §8.2)

| Skill | Rôle | Source | Quand (v1.1) | Prompt skill-creator |
|-------|------|--------|---------------|----------------------|
| `i18n-extract` | Extrait les chaînes JSX vers `src/i18n/locales/fr.json` + `en.json` + config `src/i18n/config.ts` (react-i18next) | MVP-SCOPE §13, PDL §11, SDLC §10.1 | Début v1.1 (V11-3) | Voir MVP-SCOPE §13 |
| `accessibility-audit` | Audite WCAG AA via `@axe-core/playwright` + analyse manuelle des patterns Radix (Dialog, Autocomplete, Tooltip) | MVP-SCOPE §13, PDL §11, SDLC §10.1 | V11-2 (après E2E) | Voir MVP-SCOPE §13 |
| `pwa-offline-setup` | Configure `vite-plugin-pwa` + Workbox + IndexedDB queue pour mutations offline, stratégies de cache par catégorie (app shell, API GET, images) | PDL §11 (nouveau), SDLC §10.1 | V11-4 (après i18n et a11y) | Voir PDL §11 |
| `pdf-export-builder` | Génère les templates PDF (menu hebdo + liste de courses) avec `pdf-lib` ou `@react-pdf/renderer`, gère l'i18n dans le PDF | PDL §11 (nouveau), SDLC §10.1 | V11-6 (après PWA) | Voir PDL §11 |
| `performance-audit` | Lighthouse + `vite-bundle-visualizer` + recommandations prioritisées (lazy load, dynamic import, tree-shaking) | MVP-SCOPE §13, PDL §11, SDLC §10.1 | Fin v1.1 (V11-7, après features) | Voir MVP-SCOPE §13 |
| `tech-debt-audit` | Audite la dette technique trimestriellement (complexité, fichiers > 300 lignes, hooks sans tests, deps stagnantes, TODO/FIXME) | SDLC §10.2 (optionnel) | Trimestriel dès v1.1 | Voir SDLC §10.2 |

### Skills optionnels / ponctuels

| Skill | Rôle | Source | Quand | Prompt skill-creator |
|-------|------|--------|-------|----------------------|
| `recipe-migration` | Migre des recettes depuis formats externes (Paprika, Mealie JSON, Marmiton scraping, texte libre) vers Mealie via l'API | MVP-SCOPE §13, PDL §11 | Ponctuel, hors flux continu | Voir MVP-SCOPE §13 |

### Skills nécessaires à partir de v2.0 (nouveaux, spécifiques roadmap)

#### Skill spécifique à la roadmap : `planning-ia-gen`

**Versions couvertes** : v2.0 (V20-1)

**Prompt à fournir à `skill-creator`** :

```
Utilise le skill skill-creator pour créer un skill nommé "planning-ia-gen".

Description : Génère le prompt structurant et le service de planning auto IA pour Bonap. À invoquer quand l'utilisateur dit "implémente le planning auto IA", "génère une semaine de repas par IA", "scaffold le service IPlanningGeneratorService". Le skill orchestre la génération d'une semaine complète de repas à partir de préférences utilisateur (saisons, durée max, catégories, historique) via un appel LLM structurant, avec validation JSON Schema stricte et sortie en brouillon (pas de POST direct — user valide avant application).

Processus attendu :
1. Lire les préférences depuis `IPreferencesRepository` (localStorage `bonap:preferences`) — saison, durée max, catégories préférées, catégories à éviter, nombre de repas à générer (lunch/dinner sur 7 jours).
2. Charger l'historique de planning via `GetPlanningRangeUseCase` (4 dernières semaines) pour éviter les répétitions.
3. Construire un prompt structurant au format JSON Schema attendu en sortie : `{ "week": [{ "date": "YYYY-MM-DD", "entryType": "lunch|dinner", "recipeId": "string", "recipeName": "string", "rationale": "string" }] }`.
4. Appeler `AssistantService` (Anthropic avec tool use si provider = anthropic) ou `LLMService` (single-turn avec JSON parse robuste pour les 8 autres providers).
5. Valider la sortie contre le JSON Schema ; si invalide, retry avec prompt de correction (max 2 retries).
6. Charger les `MealieRecipe` correspondantes aux `recipeId` générés via `GetRecipesByIdsUseCase` pour valider qu'elles existent.
7. Exposer la semaine générée en brouillon (type `PlannedWeek`) — l'utilisateur voit un aperçu, peut valider (POST via `AddMealUseCase`), regénérer (retry), ou annuler.
8. Si l'utilisateur valide, itérer sur chaque `PlannedWeek` item et appeler `AddMealUseCase.execute(date, entryType, recipeId)`.

allowed-tools : Read, Write, Edit, Bash, Grep, Glob

Le skill doit inclure :
- references/prompt-template.md (prompt structurant pour le LLM, format JSON attendu, contraintes de saison/durée/catégories)
- references/json-schema.md (schéma JSON de validation de la sortie LLM)
- references/fallback-strategy.md (parcours dégradé pour les 8 providers hors-Anthropic — single-turn prompt + JSON parse + retry)

Règles :
- Jamais de POST direct sans validation user (sortie en brouillon).
- Si provider ≠ anthropic, fallback single-turn sans tool use (parcours dégradé).
- Si retry > 2, afficher une erreur et proposer la saisie manuelle.
- Préserver les saisons via tags `saison-*` dans le prompt (filtrage côté client).
- Ne pas générer de repas avec une recette inexistante (validation `recipeId` via `GetRecipesByIdsUseCase`).

Sortie : `src/domain/planning/services/IPlanningGeneratorService.ts` (interface) + `src/infrastructure/llm/PlanningGeneratorService.ts` (implémentation) + `src/presentation/hooks/usePlanningGenerator.ts` + `src/presentation/pages/PreferencesPage.tsx` + intégration dans `PlanningPage` (bouton "Générer la semaine").
```

#### Skill spécifique à la roadmap : `nutrition-integration`

**Versions couvertes** : v2.0 (V20-2)

**Prompt à fournir à `skill-creator`** :

```
Utilise le skill skill-creator pour créer un skill nommé "nutrition-integration".

Description : Intègre la base nutrition (Open Food Facts par défaut, API tierce optionnelle) dans Bonap pour afficher les macros/calories par recette et l'agrégation par semaine. À invoquer quand l'utilisateur dit "implémente la nutrition", "affiche les calories d'une recette", "scaffold le service INutritionService". Le skill orchestre le lookup des foods via Open Food Facts (ou base locale), le calcul par recette (somme des ingrédients × quantité), et l'agrégation par semaine (somme des repas planifiés).

Processus attendu :
1. Créer le nouveau domaine `nutrition` via skill `scaffold-ddd-feature` (entité `NutritionInfo`, interface `INutritionService`, pas de repo Mealie — service pur).
2. Implémenter `OpenFoodFactsNutritionService` (ou `LocalNutritionService` fallback) — lookup par food name via `https://world.openfoodfacts.org/api/v2/product/{name}.json` (ou base locale CSV).
3. Pour chaque recette : itérer sur `recipeIngredient`, lookup nutrition du food via le service, multiplier par `quantity`, sommer les macros (calories, protéines, glucides, lipides, fibres).
4. Exposer `computeForRecipe(recipe: MealieRecipe): Promise<NutritionInfo>` et `aggregateForWeek(plan: MealieMealPlan[], recipes: MealieRecipe[]): Promise<NutritionInfo>`.
5. Afficher la nutrition dans `RecipeDetailModal` (panneau repliable) et dans `StatsPage` (agrégation semaine).
6. Prévoir un fallback "saisie manuelle" si le lookup Open Food Facts échoue (food non trouvé ou ambigu).
7. Mettre en cache les lookup nutrition (localStorage `bonap:nutrition_cache` avec TTL 30 jours) pour éviter les appels répétés.

allowed-tools : Read, Write, Edit, Bash, WebFetch, Grep, Glob

Le skill doit inclure :
- references/openfoodfacts-api.md (endpoint, schéma de réponse, gestion des erreurs, rate limiting)
- references/nutrition-schema.md (schéma `NutritionInfo` : calories, proteines, glucides, lipides, fibres, portionEnGrammes)
- references/fallback-strategy.md (saisie manuelle, cache, base locale CSV si OFP insuffisant)

Règles :
- Pas de blocage de l'UI pendant le lookup — afficher un skeleton et charger la nutrition en async.
- Si food non trouvé dans OFP, afficher "Nutrition non disponible" + bouton "Saisir manuellement".
- Mettre en cache tous les lookup (clé : food name normalisé via `extractFoodKey`).
- Si l'utilisateur choisit une API payante (Settings), remplacer le service par `ApiNutritionService` (DI via `container.ts`).

Sortie : `src/domain/nutrition/` (entité + interface service) + `src/infrastructure/nutrition/OpenFoodFactsNutritionService.ts` + `src/infrastructure/nutrition/LocalNutritionService.ts` (fallback) + `src/presentation/hooks/useRecipeNutrition.ts` + `src/presentation/hooks/useWeekNutrition.ts` + intégration dans `RecipeDetailModal` et `StatsPage`.
```

### Récapitulatif des skills par version

| Version | Skills nécessaires | Nouveaux skills spécifiques |
|---------|--------------------|------------------------------|
| v1.0 (livrée) | Aucun (skills créés pour v1.1+ utilisés en maintenance) | — |
| v1.1 — début | `code-review`, `commit-helper`, `branch-naming`, `e2e-test-gen`, `scaffold-ddd-feature` (priorité immédiate) | — |
| v1.1 — séquencé | `i18n-extract`, `accessibility-audit`, `pwa-offline-setup`, `pdf-export-builder`, `performance-audit`, `tech-debt-audit` (trimestriel) | — |
| v1.1 — optionnel | `recipe-migration` | — |
| v2.0 | `planning-ia-gen`, `nutrition-integration` (nouveaux spécifiques roadmap) | `planning-ia-gen`, `nutrition-integration` |

**Total skills à créer** : 12 (5 immédiats + 6 séquencés v1.1 + 1 optionnel) + 2 nouveaux v2.0 = **14 skills**.

---

## 10. MCP spécialisés à créer / installer

> MCP nécessaires par version. Reprend les MCP listés dans MVP-SCOPE §14, PDL §12, SDLC §11, et précise la version à laquelle chacun est nécessaire.

### MCP nécessaires dès v1.1 (début)

#### MCP existants à installer (priorité immédiate)

| MCP | Commande d'installation | Justification (lien avec v1.1) | Source |
|-----|--------------------------|--------------------------------|--------|
| Playwright MCP | `claude mcp add playwright -- npx -y @playwright/mcp-server` | Génération + exécution de tests E2E depuis Claude Code pendant V11-1 ; captures visuelles pour audit a11y V11-2 | MVP-SCOPE §14, PDL §12, SDLC §11 |
| Context7 MCP | `claude mcp add context7 -- npx -y @upstash/context7-mcp` | Doc libs à jour (React 19, Radix, Vite 8, Tailwind v4, React Router v7, Workbox, i18next, pdf-lib, axe-core) pendant implémentation V11-3 à V11-6 | MVP-SCOPE §14, PDL §12, SDLC §11 |
| GitHub MCP | `claude mcp add github -- npx -y @modelcontextprotocol/server-github` | Lecture/création de PRs, issues, reviews — utilisé par le skill `code-review` pour `gh pr diff` pendant toutes les PR v1.1 et v2.0 | MVP-SCOPE §14, PDL §12, SDLC §11 |
| Filesystem MCP | `claude mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem /home/zephus/Projets/bonap` | Accès fichiers étendu pour les skills de revue/audit (`code-review`, `accessibility-audit`, `performance-audit`, `tech-debt-audit`) | MVP-SCOPE §14, PDL §12, SDLC §11 |
| Sequential Thinking MCP | `claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking` | Raisonnement structuré pour la planification glissante (début session), les refactoring PWA/i18n, et la préparation du planning auto IA v2.0 | MVP-SCOPE §14, PDL §12, SDLC §11 |

#### MCP custom à développer (priorité immédiate)

##### MCP : `mealie-api`

**Versions couvertes** : v1.1, v2.0 (debug + tests + analyse pendant tout le dev)

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

**Commande d'installation** :

```bash
claude mcp add mealie-api -- node /home/zephus/Projets/bonap/mcp/mealie-api/server.js
```

> L'implémentation ira dans `mcp/mealie-api/` (server.ts + package.json + build). Variables d'env requises au lancement : `MEALIE_URL`, `MEALIE_TOKEN`. Ce MCP réutilise la logique de `MealieApiClient` déjà présente dans `src/infrastructure/mealie/api/` (shared-core ou copie).

### MCP nécessaires à partir de v1.1 (séquencé)

#### MCP existants à installer (v1.1+)

| MCP | Commande d'installation | Justification (lien avec v1.1) | Source |
|-----|--------------------------|--------------------------------|--------|
| Sentry MCP | `claude mcp add sentry -- npx -y @sentry/mcp-server` | Observabilité prod post-déploiement v1.1 — détecte les régressions PWA/i18n/PDF en prod avant v2.0 | MVP-SCOPE §14, PDL §12, SDLC §11 |

#### MCP custom à développer (v1.1)

##### MCP : `bonap-pdf`

**Versions couvertes** : v1.1 (V11-6 export PDF), v2.0 (V20-5 cookbook PDF potentiel)

**Spec d'implémentation** :

- **Transport** : stdio (local, Node.js)
- **Langage** : TypeScript (`@modelcontextprotocol/sdk`)
- **Auth** : aucune (MCP local de debug)
- **Dépendances externes** : `pdf-lib` ou `@react-pdf/renderer` (déjà dans `package.json` v1.1)

**Outils exposés (tools)** :

| Nom | Description | Entrée (schéma JSON) | Sortie |
|-----|-------------|----------------------|--------|
| `render_week_menu_pdf` | Génère un PDF du menu hebdo (plan + recettes) | `{ "plan": MealieMealPlan[], "recipes": MealieRecipe[], "locale": "fr\|en" }` | `{ "pdf_base64": "string", "size_bytes": number }` |
| `render_shopping_list_pdf` | Génère un PDF de la liste de courses (items groupés par label) | `{ "list": ShoppingList, "items": ShoppingItem[], "locale": "fr\|en" }` | `{ "pdf_base64": "string", "size_bytes": number }` |
| `validate_pdf_template` | Valide la structure d'un template PDF (i18n labels, placeholders) | `{ "template_id": "string" }` | `{ "valid": boolean, "errors": string[] }` |

**Commande d'installation** :

```bash
claude mcp add bonap-pdf -- node /home/zephus/Projets/bonap/mcp/bonap-pdf/server.js
```

### MCP nécessaires à partir de v2.0

#### MCP custom à développer (v2.0)

##### MCP : `bonap-nutrition`

**Versions couvertes** : v2.0 (V20-2 nutrition)

**Spec d'implémentation** :

- **Transport** : stdio (local, Node.js)
- **Langage** : TypeScript (`@modelcontextprotocol/sdk`)
- **Auth** : aucune pour Open Food Facts (public API) ; API key si l'utilisateur configure un service payant (passée en env `NUTRITION_API_KEY`)
- **Dépendances externes** : Open Food Facts API (`https://world.openfoodfacts.org/api/v2`) ou base locale CSV (fallback)

**Outils exposés (tools)** :

| Nom | Description | Entrée (schéma JSON) | Sortie |
|-----|-------------|----------------------|--------|
| `lookup_food_nutrition` | Lookup nutrition d'un aliment par nom | `{ "food_name": "string", "locale": "fr\|en" }` | `{ "nutrition": NutritionInfo, "source": "openfoodfacts\|local\|manual", "confidence": number }` |
| `compute_recipe_nutrition` | Calcule la nutrition d'une recette (somme ingrédients × quantité) | `{ "recipe": MealieRecipe }` | `{ "nutrition": NutritionInfo, "per_ingredient": Array<{ food: string, nutrition: NutritionInfo }> }` |
| `aggregate_week_nutrition` | Agrège la nutrition d'une semaine planifiée | `{ "plan": MealieMealPlan[], "recipes": MealieRecipe[] }` | `{ "nutrition": NutritionInfo, "per_day": Array<{ date: string, nutrition: NutritionInfo }> }` |
| `clear_nutrition_cache` | Vide le cache nutrition (localStorage `bonap:nutrition_cache`) | `{}` | `{ "ok": true }` |

**Commande d'installation** :

```bash
claude mcp add bonap-nutrition -- node /home/zephus/Projets/bonap/mcp/bonap-nutrition/server.js
```

### MCP déjà installés à réutiliser

| MCP | Versions couvertes | Rôle dans ce projet |
|-----|--------------------|---------------------|
| (vérifier `claude mcp list` pour les MCP déjà présents sur la machine — utilisateur à compléter) | v1.1, v2.0 | À évaluer |

### Récapitulatif des MCP par version

| Version | MCP existants à installer | MCP custom à développer |
|---------|---------------------------|------------------------|
| v1.1 — début | Playwright, Context7, GitHub, Filesystem, Sequential Thinking | `mealie-api` |
| v1.1 — séquencé | Sentry (post-déploiement v1.1) | `bonap-pdf` |
| v2.0 | (rien de nouveau — Sentry déjà installé en v1.1) | `bonap-nutrition` |

**Total MCP** : 6 existants à installer + 3 custom à développer = **9 MCP**.

---

## 11. Écho de vérification

### Horizon et versions

Roadmap sur **12 mois** (horizon moyen terme, du 2026-08-10 au 2027-08-10) avec **2 versions à livrer** (v1.1 cible 2027-01-15, v2.0 cible 2027-06-30) + v1.0 déjà en production (référence, maintenance continue en parallèle via patches v1.0.x et Dependabot). Chaque version a des releases intermédiaires alpha → beta → RC → prod, conformément aux gating du SDLC §6.2. La présupposition fondamentale est respectée : exécution exclusivement solo + Claude Code + sous-agents IA spécialisés créés via `skill-creator` en local — pas d'équipe humaine.

### Dates cibles

- **v1.0** : déjà en prod (v1.3.5 courant, maintenance continue).
- **v1.1** : alpha 2026-11-15, beta 2026-12-15, RC 2027-01-05, prod 2027-01-15. Développement ~44h (jalons J7-J12 du MVP-SCOPE) = ~5-6 semaines à 8h/sem, étalées sur ~3-4 mois calendaires avec marges de variance.
- **v2.0** : alpha 2027-03-15, beta 2027-04-30, RC 2027-06-15, prod 2027-06-30. Développement ~52h (jalons J13-J17 du MVP-SCOPE) = ~6-7 semaines à 8h/sem, étalées sur ~5-6 mois calendaires (v2.0 démarre après v1.1-prod stabilisée 2 semaines).

Toutes les dates sont des **jalons indicatifs glissants** (marges ±2-3 sem). Releases glissantes, pas de deadlines rigides — conformément au MVP-SCOPE §1 ("pas de date critique rigide, releases glissantes") et SDLC §1 ("flux continu, pas de deadline rigide").

### Priorisation inter-versions

- **v1.0** (livrée) : 12 fonctionnalités must-have du MVP-SCOPE §5 (recipes, planning, shopping, stats, suggestions IA, assistant IA, 9 providers LLM, thème, saisons).
- **v1.1** : robustesse + usage mobile. Tests E2E couvrant v1.0 d'abord (V11-1), accessibilité WCAG AA (V11-2), i18n FR+EN (V11-3), PWA offline (V11-4), import URL (V11-5), export PDF (V11-6), audit perfs (V11-7 inclus dans V11-2 et V11-4). Ordre séquencé selon PDL §8.2 : E2E → a11y → i18n → PWA → import URL → export PDF → perfs.
- **v2.0** : différenciation IA + manques vs Mealie natif. Planning auto IA (V20-1, la feature différenciante), nutrition (V20-2), multi-households (V20-3), partage public (V20-4), cookbook (V20-5). Ordre séquencé selon PDL §8.3 : planning auto IA d'abord (différenciation), puis manques Mealie. V20-4 et V20-5 sont indépendants et peuvent être poussés en v2.1 si v2.0 dépasse l'horizon 12 mois (Q10).

### Cadence et disponibilité

- **Méthodologie** : Kanban-solo avec sprints courts optionnels (SDLC §2). Pas de sprint timebox rigide. WIP limit = 2 (pas plus de 2 tickets `In progress` simultanément).
- **Sprints courts optionnels** : 1 à 2 sessions par sprint court, déclenchés au cas par cas pour les features suffisamment circonscrites (ex : "i18n de la page Recipes"). Pas de vélocité suivie — mesure du throughput (1 à 3 tickets `Done`/sem glissante sur 4 semaines).
- **Disponibilité déclarée** : ~8h/semaine en moyenne, variable / irrégulier (MVP-SCOPE §9). Marges incluses pour semaines à 0h (imprévus, vacances).
- **Sprints par version** : v1.1 ~5-6 sprints courts, v2.0 ~6-7 sprints courts. Trunk-based avec branches courtes (< 3 sessions), rebase au lieu de merge (SDLC §8).

### Points à clarifier

Les questions ouvertes (§8) sont à valider en cours de route par l'utilisateur, principalement après v1.1-beta (retours utilisateurs pilotes) et après v2.0-alpha (préférences IA, qualité nutrition). Les questions bloquantes pour démarrer v1.1 sont tranchées par le PDL §8.2 (ordre E2E → a11y → i18n → PWA → import URL → export PDF → perfs) et MVP-SCOPE §10 (estimations en heures). Les questions bloquantes pour démarrer v2.0 sont tranchées par PDL §8.3 (ordre planning IA → nutrition → multi-households → partage → cookbook) et la présente roadmap (démarrage v2.0 après v1.1-prod stabilisée 2 semaines). Les 12 questions ouvertes (Q1-Q12) sont des hypothèses à valider en cours d'exécution, pas des blockers pour démarrer.

### Cohérence avec les autres livrables

- **MVP-SCOPE** : la roadmap reprend les jalons §10 (J7-J17) avec les mêmes estimations (v1.1 ~44h, v2.0 ~52h) et les mêmes critères de succès §11 (Lighthouse ≥ 90, WCAG AA, E2E ≥ 80%). Les fonctionnalités must-have livrées en v1.0 sont documentées en §3.v1.0 ; les fonctionnalités hors périmètre (H1-H12) sont réparties entre v1.1 (H1, H2, H5, H10, H11, H12) et v2.0 (H3, H4, H6, H7, H8, H9).
- **PDL** : la roadmap respecte l'architecture DDD 5 couches (PDL §2.3) — chaque feature v1.1/v2.0 étend un domaine existant ou crée un nouveau domaine via le skill `scaffold-ddd-feature`. Les modules PDL concernés par chaque version sont listés dans §3.v1.1 et §3.v2.0. Le séquencement v1.1 (§8.2) et v2.0 (§8.3) du PDL est respecté dans l'ordre des jalons alpha/beta/RC/prod.
- **SDLC** : la roadmap utilise la méthodologie Kanban-solo (SDLC §2), les DoR/DoD (§4-5) comme critères de passage entre releases, les gating (§6.2) pour les transitions alpha→beta→RC→prod, et les conventions de commits/branches (§8) pour le workflow. Les skills et MCP listés dans SDLC §10-11 sont repris dans §9-10 avec leur version de nécessité.
- **MVP-EXEC** (à produire à l'étape 5) : les jalons alpha/beta/RC/prod et les fonctionnalités V11-1 à V11-7 et V20-1 à V20-5 seront décomposés en sprints et tickets labellisés par domaine + version, avec DoR/DoD du SDLC. Les releases intermédiaires de cette roadmap deviennent les milestones du plan d'exécution.

### Présupposition fondamentale respectée

**Exécution exclusivement solo + Claude Code + sous-agents IA spécialisés créés via `skill-creator` en local. Pas d'équipe humaine.** Tous les jalons (alpha, beta, RC, prod) sont validés par l'utilisateur seul, assisté de Claude Code et des sous-agents IA (`code-review`, `commit-helper`, `branch-naming`, `e2e-test-gen`, `accessibility-audit`, `performance-audit`, `scaffold-ddd-feature`, `i18n-extract`, `pwa-offline-setup`, `pdf-export-builder`, `tech-debt-audit`, `planning-ia-gen`, `nutrition-integration`). Le throughput cible (1-3 tickets/sem) est calibré sur la disponibilité déclarée (~8h/sem variable). Les dates cibles sont glissantes et absorbent la variabilité — il n'y a pas de deadline externe (pas de levée, pas d'événement, pas de date contractuelle).