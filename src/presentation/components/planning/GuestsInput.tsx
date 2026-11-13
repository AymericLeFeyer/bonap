import { useId, useState } from "react"
import { X } from "lucide-react"
import { cn } from "../../../lib/utils.ts"
import { cleanGuestName, guestKey, normalizeGuestNames } from "../../../shared/utils/guests.ts"

interface GuestsInputProps {
  value: string[]
  onChange: (guests: string[]) => void
  /** Noms déjà utilisés, proposés en autocomplétion. */
  suggestions: string[]
}

/** Saisie libre d'invités sous forme de puces, avec suggestions des noms connus. */
export function GuestsInput({ value, onChange, suggestions }: GuestsInputProps) {
  const [draft, setDraft] = useState("")
  const listId = useId()
  const taken = new Set(value.map(guestKey))
  const available = suggestions.filter((name) => !taken.has(guestKey(name)))

  const commit = (raw: string) => {
    const name = cleanGuestName(raw)
    if (name) onChange(normalizeGuestNames([...value, name]))
    setDraft("")
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 rounded-[var(--radius-lg)] border border-input bg-card px-2 py-1.5",
        "focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-ring/30",
      )}
    >
      {value.map((name) => (
        <span
          key={guestKey(name)}
          className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium"
        >
          {name}
          <button
            type="button"
            onClick={() => onChange(value.filter((n) => n !== name))}
            aria-label={`Retirer ${name}`}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        list={listId}
        value={draft}
        onChange={(e) => {
          const next = e.target.value
          // Choisir une suggestion de la liste l'ajoute directement.
          if (available.some((name) => name === next)) commit(next)
          else setDraft(next)
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault()
            commit(draft)
          } else if (e.key === "Backspace" && !draft && value.length > 0) {
            onChange(value.slice(0, -1))
          }
        }}
        onBlur={() => draft && commit(draft)}
        placeholder={value.length === 0 ? "Ajouter un invité…" : ""}
        aria-label="Ajouter un invité"
        className="min-w-[8rem] flex-1 bg-transparent py-0.5 text-sm outline-none placeholder:text-muted-foreground/60"
      />
      <datalist id={listId}>
        {available.map((name) => (
          <option key={guestKey(name)} value={name} />
        ))}
      </datalist>
    </div>
  )
}
