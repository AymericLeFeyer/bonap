/**
 * Structural shape of a unit of measure. Kept structural so this helper stays
 * free of any dependency on the shopping domain.
 */
interface QuantityUnit {
  name: string
  pluralName?: string
  abbreviation?: string
  pluralAbbreviation?: string
  useAbbreviation?: boolean
}

/** Formats a number the way Mealie does: no trailing zeros on whole values. */
export function formatAmount(quantity: number): string {
  const rounded = Math.round(quantity * 100) / 100
  return rounded % 1 === 0 ? String(Math.round(rounded)) : String(rounded)
}

/**
 * Renders the unit label for a given quantity, following Mealie's own rules:
 * the abbreviation wins when the unit is flagged `useAbbreviation`, and the
 * plural form is used beyond one.
 */
export function formatUnit(quantity: number, unit?: QuantityUnit): string {
  if (!unit) return ""
  const plural = quantity > 1
  if (unit.useAbbreviation && unit.abbreviation) {
    return (plural && unit.pluralAbbreviation) || unit.abbreviation
  }
  return (plural && unit.pluralName) || unit.name
}

/**
 * Formats a shopping item's quantity together with its unit — "700 g",
 * "3 c. à s.", or just "3" when the item carries no unit.
 * Returns an empty string when there is nothing meaningful to show.
 */
export function formatItemQuantity(quantity?: number, unit?: QuantityUnit): string {
  if (quantity === undefined || quantity <= 0) return ""
  const amount = formatAmount(quantity)
  const label = formatUnit(quantity, unit)
  return label ? `${amount} ${label}` : amount
}
