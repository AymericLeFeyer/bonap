export interface DefaultHabituelCategory {
  id: string
  emoji: string
  label: string
  items: string[]
}

export const DEFAULT_HABITUELS: DefaultHabituelCategory[] = [
  {
    id: "pain",
    emoji: "🥖",
    label: "Pain & accompagnements",
    items: [
      "Baguette", "Pain complet", "Pain de mie", "Pain grillé / biscottes",
      "Tortillas / wraps", "Cracottes / galettes de riz",
    ],
  },
  {
    id: "tartinables",
    emoji: "🧈",
    label: "Tartinables & petits plaisirs",
    items: [
      "Beurre", "Margarine", "Confiture", "Miel",
      "Pâte à tartiner", "Beurre de cacahuète", "Fromage à tartiner",
    ],
  },
  {
    id: "condiments",
    emoji: "🧂",
    label: "Condiments & sauces",
    items: [
      "Sel", "Poivre", "Sucre", "Épices (paprika, curry…)",
      "Huile d'olive", "Huile de tournesol", "Vinaigre balsamique",
      "Moutarde", "Mayonnaise", "Ketchup", "Sauce soja",
      "Sauce piquante", "Bouillon cube",
    ],
  },
  {
    id: "laitiers",
    emoji: "🧀",
    label: "Produits laitiers",
    items: [
      "Fromage râpé", "Fromages individuels", "Crème fraîche",
      "Yaourts nature", "Yaourts aromatisés", "Desserts lactés",
    ],
  },
  {
    id: "boissons-chaudes",
    emoji: "☕",
    label: "Boissons chaudes",
    items: [
      "Café", "Thé", "Infusions / tisanes", "Chocolat en poudre",
    ],
  },
  {
    id: "boissons-froides",
    emoji: "🥤",
    label: "Boissons froides",
    items: [
      "Eau plate", "Eau gazeuse", "Jus de fruits",
      "Sodas", "Sirop", "Lait", "Lait végétal",
    ],
  },
  {
    id: "collations-sucrees",
    emoji: "🍪",
    label: "Collations sucrées",
    items: [
      "Biscuits", "Gâteaux", "Barres de céréales",
      "Chocolat", "Bonbons", "Compotes",
    ],
  },
  {
    id: "collations-salees",
    emoji: "🧆",
    label: "Collations salées",
    items: [
      "Chips", "Crackers", "Amandes / noix",
      "Cacahuètes", "Olives",
    ],
  },
  {
    id: "frais-rapides",
    emoji: "🥗",
    label: "Produits frais rapides",
    items: [
      "Salade en sachet", "Crudités prêtes", "Fruits (snacking)",
      "Œufs", "Jambon", "Saucisson",
    ],
  },
  {
    id: "surgeles",
    emoji: "🧊",
    label: "Surgelés",
    items: [
      "Légumes nature", "Frites / potatoes",
      "Nuggets", "Pizzas surgelées", "Glaces",
    ],
  },
  {
    id: "hygiene",
    emoji: "🧻",
    label: "Hygiène personnelle",
    items: [
      "Gel douche", "Savon", "Shampoing", "Après-shampoing",
      "Déodorant", "Crème hydratante", "Dentifrice",
      "Brosse à dents", "Fil dentaire", "Rasoir",
      "Protections hygiéniques", "Mouchoirs", "Lingettes",
    ],
  },
  {
    id: "entretien",
    emoji: "🧼",
    label: "Entretien maison",
    items: [
      "Produit multi-surfaces", "Désinfectant", "Éponges",
      "Liquide vaisselle", "Pastilles lave-vaisselle",
      "Essuie-tout", "Lessive", "Adoucissant",
    ],
  },
  {
    id: "sanitaires",
    emoji: "🚽",
    label: "Sanitaires",
    items: [
      "Papier toilette", "Nettoyant WC", "Désodorisant",
    ],
  },
  {
    id: "consommables",
    emoji: "🧺",
    label: "Consommables pratiques",
    items: [
      "Papier aluminium", "Film alimentaire",
      "Sacs congélation", "Sacs poubelle",
      "Papier cuisson", "Boîtes de conservation",
    ],
  },
  {
    id: "divers",
    emoji: "🔋",
    label: "Divers",
    items: [
      "Piles", "Ampoules", "Briquet / allumettes",
      "Scotch / adhésif",
    ],
  },
  {
    id: "animaux",
    emoji: "🐾",
    label: "Animaux",
    items: [
      "Nourriture animale", "Litière", "Friandises animales",
    ],
  },
]
