import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { InlineEditServings } from "./RecipeEditorShared.tsx"

function renderControl(value: string, baseServings?: number, onChange = vi.fn()) {
  return {
    onChange,
    ...render(<InlineEditServings value={value} baseServings={baseServings} onChange={onChange} />),
  }
}

describe("InlineEditServings", () => {
  it("affiche la valeur courante", () => {
    renderControl("4")
    const input = screen.getByLabelText("Nombre de portions") as HTMLInputElement
    expect(input.value).toBe("4")
  })

  it("incrémente de 1 quand on clique +", () => {
    const { onChange } = renderControl("4")
    fireEvent.click(screen.getByLabelText("Augmenter le nombre de portions"))
    expect(onChange).toHaveBeenCalledWith("5")
  })

  it("décrémente de 1 quand on clique -", () => {
    const { onChange } = renderControl("4")
    fireEvent.click(screen.getByLabelText("Diminuer le nombre de portions"))
    expect(onChange).toHaveBeenCalledWith("3")
  })

  it("bloque la décrémentation sous le min (1 par défaut)", () => {
    renderControl("1")
    const minus = screen.getByLabelText("Diminuer le nombre de portions") as HTMLButtonElement
    expect(minus).toBeDisabled()
  })

  it("affiche le multiplicateur quand la valeur diffère de la base", () => {
    renderControl("8", 4)
    expect(screen.getByText("2×")).toBeInTheDocument()
  })

  it("affiche un multiplicateur fractionnaire arrondi à 2 décimales", () => {
    renderControl("6", 4)
    expect(screen.getByText("1.5×")).toBeInTheDocument()
  })

  it("n'affiche pas de multiplicateur quand la valeur égale la base", () => {
    renderControl("4", 4)
    expect(screen.queryByText(/×/)).not.toBeInTheDocument()
  })

  it("n'affiche pas de multiplicateur sans baseServings", () => {
    renderControl("4")
    expect(screen.queryByText(/×/)).not.toBeInTheDocument()
  })

  it("appelle onChange avec la valeur saisie au clavier", () => {
    const { onChange } = renderControl("4")
    const input = screen.getByLabelText("Nombre de portions") as HTMLInputElement
    fireEvent.change(input, { target: { value: "10" } })
    expect(onChange).toHaveBeenCalledWith("10")
  })

  it("appelle onChange avec une chaîne vide quand l'utilisateur efface l'input", () => {
    const { onChange } = renderControl("4")
    const input = screen.getByLabelText("Nombre de portions") as HTMLInputElement
    fireEvent.change(input, { target: { value: "" } })
    expect(onChange).toHaveBeenCalledWith("")
  })

  it("clamp la valeur saisie au max", () => {
    const { onChange } = renderControl("4")
    const input = screen.getByLabelText("Nombre de portions") as HTMLInputElement
    fireEvent.change(input, { target: { value: "999" } })
    expect(onChange).toHaveBeenCalledWith("99")
  })
})
