# Bonap — Plugins TRMNL

Deux templates Liquid pour TRMNL BYOS affichant le planning repas depuis Mealie.

---

## `planning-3days.html` — Planning sur plusieurs jours

### Endpoint à configurer dans TRMNL

```
GET http://MEALIE_URL/api/households/mealplans?page=1&perPage=10&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
```

**Header :**
```
Authorization: Bearer MEALIE_TOKEN
```

**Exemple concret :**
```
http://192.168.1.50:9000/api/households/mealplans?page=1&perPage=10&start_date=2026-03-28&end_date=2026-04-28
```

> ⚠️ **Contrainte sur les dates** : `start_date` doit correspondre à aujourd'hui ou une date proche, sinon les repas passés apparaissent en premier. Il faut mettre à jour l'URL manuellement (ex: une fois par mois). Mettre `perPage=10` limite à 10 repas — assez pour couvrir ~5 jours.

---

## `next-meal.html` — Prochain repas avec détails

### Endpoint à configurer dans TRMNL

```
GET http://MEALIE_URL/api/households/mealplans?page=1&perPage=1&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
```

**Header :**
```
Authorization: Bearer MEALIE_TOKEN
```

**Exemple concret :**
```
http://192.168.1.50:9000/api/households/mealplans?page=1&perPage=1&start_date=2026-03-28&end_date=2026-03-29
```

Le `perPage=1` récupère uniquement le premier repas à venir. La logique "déjeuner avant 12h / dîner après 12h" n'est pas gérée automatiquement — le template affiche simplement `items[0]`, c'est-à-dire le premier repas retourné par Mealie (trié par date ASC).

> ⚠️ Même contrainte sur les dates : à mettre à jour régulièrement.

### Remplacer l'URL Mealie dans le template

La photo de la recette est chargée depuis Mealie. Dans `next-meal.html`, remplace `YOUR_MEALIE_URL` par l'URL de ton instance :

```html
background-image: url('http://192.168.1.50:9000/api/media/recipes/...')
```

> ℹ️ L'image est chargée directement par le device TRMNL depuis le réseau local. Elle ne nécessite pas d'auth (les images Mealie sont publiques). Si ton device TRMNL est sur le même réseau que Mealie, ça fonctionne sans configuration supplémentaire.
