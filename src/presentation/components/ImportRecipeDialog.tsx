import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Link, Loader2, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog.tsx"
import { Input } from "./ui/input.tsx"
import { Button } from "./ui/button.tsx"
import { Label } from "./ui/label.tsx"
import { useCreateRecipeFromUrl } from "../hooks/useCreateRecipeFromUrl.ts"

interface ImportRecipeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportRecipeDialog({
  open,
  onOpenChange,
}: ImportRecipeDialogProps) {
  const [url, setUrl] = useState("")
  const { createFromUrl, loading, error } = useCreateRecipeFromUrl()
  const navigate = useNavigate()

  const handleOpenChange = (value: boolean) => {
    if (!value && !loading) {
      setUrl("")
      onOpenChange(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedUrl = url.trim()
    if (!trimmedUrl) return

    const slug = await createFromUrl(trimmedUrl)
    if (slug) {
      onOpenChange(false)
      setUrl("")
      navigate(`/recipes/${slug}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importer une recette</DialogTitle>
          <DialogDescription>
            Collez l'URL d'une page de recette pour l'importer automatiquement.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipe-url">URL de la recette</Label>
            <div className="relative">
              <Link className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="recipe-url"
                type="url"
                placeholder="https://www.exemple.com/ma-recette"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pl-9"
                autoFocus
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !url.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Import en cours…
                </>
              ) : (
                "Importer"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
