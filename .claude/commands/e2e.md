# Lancer les tests end-to-end Playwright

Lance les tests e2e Playwright. Requiert que le serveur de dev soit déjà lancé sur le port 5173.

```bash
npx playwright test
```

Pour lancer un test spécifique :

```bash
npx playwright test e2e/<fichier>.spec.ts
```

Pour voir le rapport HTML après les tests :

```bash
npx playwright show-report
```

Les tests sont dans `e2e/`. La config Playwright est dans `playwright.config.ts`.
