import { describe, it, expect } from "vitest"
import {
  courseTagNamesToWrite,
  getRecipeCourses,
  inferCoursesFromLabels,
  isCourseTag,
  recipeHasCourse,
  toggleCourse,
} from "./course.ts"

const tag = (name: string) => ({ id: name, name, slug: name })
const cat = (name: string) => ({ id: name, groupId: "", name, slug: name })

describe("isCourseTag", () => {
  it("reconnaît uniquement les types connus", () => {
    expect(isCourseTag(tag("type-dessert"))).toBe(true)
    expect(isCourseTag(tag("type-asiatique"))).toBe(false)
    expect(isCourseTag(tag("saison-ete"))).toBe(false)
  })
})

describe("getRecipeCourses", () => {
  it("considère une recette sans indication comme un plat", () => {
    expect(getRecipeCourses({ tags: [], recipeCategory: [] })).toEqual(["plat"])
    expect(getRecipeCourses(undefined)).toEqual(["plat"])
  })

  it("lit les tags type- dans l'ordre du repas", () => {
    expect(getRecipeCourses({ tags: [tag("type-plat"), tag("type-entree")] })).toEqual(["entree", "plat"])
  })

  it("devine le type depuis une catégorie existante", () => {
    expect(getRecipeCourses({ recipeCategory: [cat("Desserts")] })).toEqual(["dessert"])
    expect(getRecipeCourses({ tags: [tag("Entrée")] })).toEqual(["entree"])
  })

  it("privilégie les tags type- sur les catégories", () => {
    expect(getRecipeCourses({ recipeCategory: [cat("Dessert")], tags: [tag("type-plat")] })).toEqual(["plat"])
  })
})

describe("inferCoursesFromLabels", () => {
  it("ignore les accents et la casse", () => {
    expect(inferCoursesFromLabels(["ENTRÉES froides"])).toEqual(["entree"])
    expect(inferCoursesFromLabels(["Pâtisserie"])).toEqual(["dessert"])
    expect(inferCoursesFromLabels(["Plats principaux"])).toEqual(["plat"])
  })

  it("ne confond pas un mot qui contient le terme", () => {
    expect(inferCoursesFromLabels(["Rentrée scolaire", "Plateau"])).toBeNull()
  })
})

describe("recipeHasCourse", () => {
  it("une tarte à la fraise rangée en dessert n'est pas un plat", () => {
    const tarte = { recipeCategory: [cat("Dessert")] }
    expect(recipeHasCourse(tarte, "plat")).toBe(false)
    expect(recipeHasCourse(tarte, "dessert")).toBe(true)
  })
})

describe("toggleCourse", () => {
  it("ajoute et retire en gardant l'ordre", () => {
    expect(toggleCourse(["plat"], "entree")).toEqual(["entree", "plat"])
    expect(toggleCourse(["entree", "plat"], "plat")).toEqual(["entree"])
  })

  it("garde toujours au moins un type", () => {
    expect(toggleCourse(["dessert"], "dessert")).toEqual(["dessert"])
  })
})

describe("courseTagNamesToWrite", () => {
  it("n'écrit rien pour un simple plat", () => {
    expect(courseTagNamesToWrite(["plat"], {})).toEqual([])
  })

  it("écrit les tags d'un dessert", () => {
    expect(courseTagNamesToWrite(["dessert"], {})).toEqual(["type-dessert"])
    expect(courseTagNamesToWrite(["entree", "plat"], {})).toEqual(["type-entree", "type-plat"])
  })

  it("n'écrit rien quand la catégorie donne déjà le bon type", () => {
    expect(courseTagNamesToWrite(["dessert"], { recipeCategory: [cat("Desserts")] })).toEqual([])
  })

  it("écrit type-plat pour contredire une catégorie dessert", () => {
    expect(courseTagNamesToWrite(["plat"], { recipeCategory: [cat("Desserts")] })).toEqual(["type-plat"])
  })
})
