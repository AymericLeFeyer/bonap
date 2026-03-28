# Bonap — Plugins TRMNL

Deux templates Liquid pour TRMNL BYOS. Les données sont servies par le **BFF Bonap** (`bff/`), un micro-serveur Node.js qui appelle Mealie et transforme les données.

---

## Démarrage du BFF

### Via docker-compose (avec Bonap)

Le service `bonap-trmnl` est inclus dans `docker-compose.yml`. Configurer `MEALIE_URL` et `MEALIE_TOKEN` puis :

```bash
docker compose up -d
```

Le BFF est accessible sur `http://localhost:3001`.

### Via Home Assistant

Installer l'addon **Bonap TRMNL** depuis le store HA (dépôt `AyLabsCode/aylabs-ha-addons`). Configurer l'URL Mealie et le token dans l'onglet Configuration.

---

## `planning-3days.html` — Planning sur N jours

### Endpoint à configurer dans TRMNL

```
GET http://BFF_HOST:3001/planning?days=3
```

Changer `days` pour afficher plus ou moins de jours (max 14). URL statique, jamais besoin de la mettre à jour.

### Exemple de réponse

```json
{
  "days": [
    {
      "date": "2026-03-28",
      "display": "Sam. 28 mars",
      "label": "Aujourd'hui",
      "meals": [
        { "type": "lunch", "label": "Déjeuner", "name": "Poulet rôti" },
        { "type": "dinner", "label": "Dîner", "name": "Salade niçoise" }
      ]
    }
  ]
}
```

---

## `next-meal.html` — Prochain repas avec détails

### Endpoint à configurer dans TRMNL

```
GET http://BFF_HOST:3001/next_meal
```

URL statique. Le BFF calcule automatiquement le repas le plus proche selon l'heure (8h → petit-déjeuner, 12h → déjeuner, 20h → dîner). Si un créneau n'est pas planifié, il est ignoré. Si seulement le déjeuner est planifié, il s'affiche toute la journée.

### Exemple de réponse

```json
{
  "empty": false,
  "type": "lunch",
  "label": "Déjeuner",
  "date": "2026-03-28",
  "name": "Poulet rôti",
  "image_url": "http://mealie.local:9000/api/media/recipes/UUID/images/min-original.webp",
  "description": "...",
  "ingredients": ["200 g farine", "2 oeufs"],
  "instructions": ["Préchauffer le four à 200°C", "Assaisonner le poulet"]
}
```

> Si `empty: true`, le template affiche "Aucun repas prévu".

> L'image est chargée directement par le device TRMNL depuis `image_url`. Pour que ça fonctionne, le device doit être sur le même réseau que Mealie (ce qui est le cas pour un TRMNL BYOS en local).
