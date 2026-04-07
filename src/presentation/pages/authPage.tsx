import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button.tsx'
import { Input } from '../components/ui/input.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card.tsx'
import { Loader2, AlertCircle, UtensilsCrossed } from 'lucide-react'
import { cn } from '../../lib/utils.ts'
import { loginUseCase } from '../../infrastructure/container.ts'
import {
  getEnv,
  getIngressBasename,
  isDockerRuntime,
} from '../../shared/utils/env.ts'

const STORAGE_KEYS = {
  MEALIE_URL: 'bonap-mealie-url',
  MEALIE_TOKEN: 'bonap-mealie-token',
}

export function AuthPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const tokens = await loginUseCase.execute(username, password)

      const mealieUrl = isDockerRuntime()
        ? getIngressBasename()
        : getEnv('VITE_MEALIE_URL').replace(/\/+$/, '')

      localStorage.setItem(STORAGE_KEYS.MEALIE_URL, mealieUrl)
      localStorage.setItem(STORAGE_KEYS.MEALIE_TOKEN, tokens.accessToken)

      window.__ENV__ = {
        VITE_MEALIE_URL: mealieUrl,
        VITE_MEALIE_TOKEN: tokens.accessToken,
      }

      navigate('/recipes', { replace: true })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Impossible de se connecter',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[var(--radius-xl)] bg-primary/10">
            <UtensilsCrossed className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1.5">
            <CardTitle className="text-2xl">Bienvenue sur Bonap</CardTitle>
            <CardDescription>
              Entrez vos identifiants Mealie pour accéder à votre espace
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                Nom d'utilisateur
              </label>
              <Input
                id="username"
                type="text"
                placeholder="votre@email.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Mot de passe
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Votre mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-destructive/20 bg-destructive/8 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connexion...
                </>
              ) : (
                'Se connecter'
              )}
            </Button>
          </form>

          <p className={cn('mt-4 text-center text-xs text-muted-foreground')}>
            Vos identifiants sont échangés directement avec votre instance
            Mealie
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
