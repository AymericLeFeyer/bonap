// Fixtures de données Mealie réalistes pour les tests E2E

export const RECIPE_PIZZA = {
  id: "abc123",
  slug: "pizza-maison",
  name: "Pizza maison",
  description: "Une pizza classique avec une pâte croustillante.",
  prepTime: "PT30M",
  performTime: "PT45M",
  totalTime: "PT1H15M",
  recipeIngredient: [
    {
      referenceId: "ri1",
      quantity: 500,
      unit: { id: "u1", name: "g", abbreviation: "g", useAbbreviation: true },
      food: { id: "f1", name: "farine" },
      note: "",
      display: "500 g farine",
    },
    {
      referenceId: "ri2",
      quantity: 1,
      unit: { id: "u2", name: "sachet", abbreviation: null, useAbbreviation: false },
      food: { id: "f2", name: "levure boulangère" },
      note: "",
      display: "1 sachet levure boulangère",
    },
    {
      referenceId: "ri3",
      quantity: 200,
      unit: { id: "u3", name: "g", abbreviation: "g", useAbbreviation: true },
      food: { id: "f3", name: "mozzarella" },
      note: "",
      display: "200 g mozzarella",
    },
  ],
  recipeInstructions: [
    { id: "i1", text: "Pétrir la pâte avec la farine, la levure et l'eau tiède." },
    { id: "i2", text: "Laisser reposer 30 minutes sous un linge humide." },
    { id: "i3", text: "Étaler la pâte et garnir de sauce tomate et mozzarella." },
    { id: "i4", text: "Cuire 15 minutes à 220°C." },
  ],
  tags: [
    { id: "t1", name: "saison-ete", slug: "saison-ete" },
  ],
  recipeCategory: [
    { id: "c1", name: "Plat principal", slug: "plat-principal" },
  ],
  extras: {},
}

export const RECIPE_SALADE = {
  id: "def456",
  slug: "salade-nicoise",
  name: "Salade niçoise",
  description: "Une salade fraîche du sud.",
  prepTime: "PT15M",
  performTime: null,
  totalTime: "PT15M",
  recipeIngredient: [
    {
      referenceId: "ri4",
      quantity: 2,
      unit: null,
      food: { id: "f4", name: "tomates" },
      note: "",
      display: "2 tomates",
    },
    {
      referenceId: "ri5",
      quantity: 1,
      unit: { id: "u4", name: "boîte", abbreviation: null, useAbbreviation: false },
      food: { id: "f5", name: "thon" },
      note: "au naturel",
      display: "1 boîte thon au naturel",
    },
  ],
  recipeInstructions: [
    { id: "i5", text: "Laver et couper les légumes." },
    { id: "i6", text: "Mélanger tous les ingrédients dans un saladier." },
  ],
  tags: [
    { id: "t2", name: "saison-ete", slug: "saison-ete" },
    { id: "t3", name: "rapide", slug: "rapide" },
  ],
  recipeCategory: [
    { id: "c1", name: "Plat principal", slug: "plat-principal" },
  ],
  extras: {},
}

// Réponse paginée pour GET /api/recipes
export const RECIPES_LIST_RESPONSE = {
  items: [RECIPE_PIZZA, RECIPE_SALADE],
  page: 1,
  per_page: 50,
  total: 2,
  total_pages: 1,
}

// Réponse pour GET /api/households/mealplans
export const MEALPLANS_RESPONSE = {
  items: [
    {
      id: 1,
      date: "2026-04-07",
      entryType: "dinner",
      title: null,
      recipeId: "abc123",
      recipe: {
        id: "abc123",
        slug: "pizza-maison",
        name: "Pizza maison",
        description: "Une pizza classique",
      },
    },
    {
      id: 2,
      date: "2026-04-08",
      entryType: "lunch",
      title: null,
      recipeId: "def456",
      recipe: {
        id: "def456",
        slug: "salade-nicoise",
        name: "Salade niçoise",
        description: "Une salade fraîche",
      },
    },
  ],
  page: 1,
  per_page: -1,
  total: 2,
  total_pages: 1,
}

// Listes de courses
export const SHOPPING_LISTS_RESPONSE = {
  items: [
    { id: "list-bonap", name: "Bonap" },
    { id: "list-habituels", name: "Habituels" },
  ],
  page: 1,
  per_page: -1,
  total: 2,
  total_pages: 1,
}

export const SHOPPING_LIST_BONAP_RESPONSE = {
  id: "list-bonap",
  name: "Bonap",
  listItems: [
    {
      id: "item1",
      shoppingListId: "list-bonap",
      checked: false,
      position: 0,
      isFood: true,
      note: "farine",
      quantity: 500,
      unitId: "u1",
      unitName: "g",
      foodId: "f1",
      foodName: "farine",
      label: { id: "label1", name: "Féculents", color: "#ff0000" },
      display: "500 g farine",
    },
    {
      id: "item2",
      shoppingListId: "list-bonap",
      checked: false,
      position: 1,
      isFood: true,
      note: "mozzarella",
      quantity: 200,
      unitId: "u3",
      unitName: "g",
      foodId: "f3",
      foodName: "mozzarella",
      label: { id: "label2", name: "Produits laitiers", color: "#00ff00" },
      display: "200 g mozzarella",
    },
  ],
  // Format attendu par ShoppingRepository.getItems() : { label: { id, name, color } }
  labelSettings: [
    { label: { id: "label1", name: "Féculents", color: "#ff0000" } },
    { label: { id: "label2", name: "Produits laitiers", color: "#00ff00" } },
  ],
}

export const SHOPPING_LIST_HABITUELS_RESPONSE = {
  id: "list-habituels",
  name: "Habituels",
  listItems: [],
  labelSettings: [],
}

// Référentiels
export const CATEGORIES_RESPONSE = {
  items: [
    { id: "c1", name: "Plat principal", slug: "plat-principal" },
    { id: "c2", name: "Entrée", slug: "entree" },
    { id: "c3", name: "Dessert", slug: "dessert" },
  ],
  page: 1,
  per_page: -1,
  total: 3,
  total_pages: 1,
}

export const TAGS_RESPONSE = {
  items: [
    { id: "t1", name: "saison-ete", slug: "saison-ete" },
    { id: "t2", name: "saison-hiver", slug: "saison-hiver" },
    { id: "t3", name: "rapide", slug: "rapide" },
    { id: "t4", name: "végétarien", slug: "vegetarien" },
  ],
  page: 1,
  per_page: -1,
  total: 4,
  total_pages: 1,
}

export const FOODS_RESPONSE = {
  items: [
    { id: "f1", name: "farine" },
    { id: "f2", name: "levure boulangère" },
    { id: "f3", name: "mozzarella" },
    { id: "f4", name: "tomates" },
    { id: "f5", name: "thon" },
  ],
  page: 1,
  per_page: -1,
  total: 5,
  total_pages: 1,
}

export const UNITS_RESPONSE = {
  items: [
    { id: "u1", name: "gramme", abbreviation: "g", useAbbreviation: true },
    { id: "u2", name: "sachet", abbreviation: null, useAbbreviation: false },
    { id: "u3", name: "boîte", abbreviation: null, useAbbreviation: false },
    { id: "u4", name: "cuillère à soupe", abbreviation: "c. à s.", useAbbreviation: true },
  ],
  page: 1,
  per_page: -1,
  total: 4,
  total_pages: 1,
}
