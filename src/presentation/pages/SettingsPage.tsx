import { useState, useEffect } from "react"
import { getEnv, getIngressBasename } from "../../shared/utils/env.ts"
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2, Check, Sun, Moon, Monitor, Palette, Bot, Server, Info, Lock } from "lucide-react"
import { Button } from "../components/ui/button.tsx"
import { Input } from "../components/ui/input.tsx"
import { Label } from "../components/ui/label.tsx"
import { llmConfigService, getLLMEnvFields } from "../../infrastructure/llm/LLMConfigService.ts"
import type { LLMConfig, LLMProvider } from "../../shared/types/llm.ts"
import { LLM_PROVIDERS } from "../../shared/types/llm.ts"
import { useTheme } from "../hooks/useTheme.ts"
import { ACCENT_COLORS } from "../../infrastructure/theme/ThemeService.ts"
import type { Theme } from "../../infrastructure/theme/ThemeService.ts"
import { cn } from "../../lib/utils.ts"

type TestStatus = { state: "idle" } | { state: "loading" } | { state: "ok"; message: string } | { state: "error"; message: string }

function EnvBadge() {
  return (
    <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      env
    </span>
  )
}

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Clair", icon: Sun },
  { value: "dark", label: "Sombre", icon: Moon },
  { value: "system", label: "Système", icon: Monitor },
]

export function SettingsPage() {
  const { theme, setTheme, accentColor, setAccentColor } = useTheme()
  const [config, setConfig] = useState<LLMConfig>(() => llmConfigService.load())
  const envFields = getLLMEnvFields()
  const [showKey, setShowKey] = useState(false)
  const [testStatus, setTestStatus] = useState<TestStatus>({ state: "idle" })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    llmConfigService.save(config)
    setSaved(true)
    const t = setTimeout(() => setSaved(false), 1500)
    return () => clearTimeout(t)
  }, [config])

  const providerInfo = LLM_PROVIDERS[config.provider]

  const handleProviderChange = (provider: LLMProvider) => {
    const info = LLM_PROVIDERS[provider]
    setConfig((prev) => ({
      ...prev,
      provider,
      model: info.models[0] ?? "",
    }))
    setTestStatus({ state: "idle" })
    setShowKey(false)
  }

  const handleTest = async () => {
    setTestStatus({ state: "loading" })
    const result = await llmConfigService.testConnection(config)
    setTestStatus(result.ok ? { state: "ok", message: result.message } : { state: "error", message: result.message })
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold">Paramètres</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configuration de l'apparence et des connexions.</p>
      </div>

      {/* ── Section Apparence ── */}
      <section className="rounded-[var(--radius-2xl)] border border-border/50 bg-card shadow-subtle space-y-6 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] bg-primary/8">
            <Palette className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold leading-none">Apparence</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Personnalisez l'aspect visuel de l'application.</p>
          </div>
        </div>

        {/* Sélecteur de thème */}
        <div className="space-y-2.5">
          <Label>Thème</Label>
          <div className="flex gap-2">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={cn(
                  "flex items-center gap-2 rounded-[var(--radius-lg)] border px-4 py-2.5",
                  "text-sm font-semibold transition-all duration-150",
                  theme === value
                    ? "border-primary bg-primary text-primary-foreground shadow-[0_1px_3px_oklch(0.58_0.175_38/0.25)]"
                    : "border-border bg-card text-foreground hover:bg-secondary",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Sélecteur de couleur principale */}
        <div className="space-y-3">
          <div>
            <Label>Couleur principale</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sélectionnée : <span className="font-semibold text-foreground">{accentColor.name}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {ACCENT_COLORS.map((color) => (
              <button
                key={color.id}
                type="button"
                onClick={() => setAccentColor(color)}
                title={color.name}
                aria-label={color.name}
                className={cn(
                  "relative h-9 w-9 rounded-full",
                  "transition-all duration-150 hover:scale-110",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  accentColor.id === color.id && "ring-2 ring-offset-2 ring-foreground/25 scale-110",
                )}
                style={{ backgroundColor: `oklch(${color.oklch})` }}
              >
                {accentColor.id === color.id && (
                  <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section IA ── */}
      <section className="rounded-[var(--radius-2xl)] border border-border/50 bg-card shadow-subtle space-y-6 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] bg-[oklch(0.93_0.04_290)] dark:bg-[oklch(0.22_0.04_290)]">
            <Bot className="h-4 w-4 text-[oklch(0.50_0.14_290)] dark:text-[oklch(0.72_0.14_290)]" />
          </div>
          <div>
            <h2 className="text-base font-bold leading-none">Fournisseur IA</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {envFields.size > 0
                ? "Certains paramètres sont gérés via variables d'environnement."
                : "Utilisé pour l'assistant, les suggestions et la vision. La clé est stockée localement."}
            </p>
          </div>
        </div>

        {/* Bannière env */}
        {envFields.size > 0 && (
          <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-border bg-secondary/50 px-4 py-3">
            <Lock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Les champs marqués <span className="font-semibold text-foreground">ENV</span> sont verrouillés.
              Pour les modifier, mettez à jour les variables d'environnement dans la{" "}
              <span className="font-semibold text-foreground">configuration de l'addon Home Assistant</span>{" "}
              ou votre <span className="font-semibold text-foreground">docker-compose.yml</span>, puis redémarrez.
            </p>
          </div>
        )}

        {/* Sélecteur de fournisseur */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <Label>Fournisseur</Label>
            {envFields.has("provider") && <EnvBadge />}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(LLM_PROVIDERS) as LLMProvider[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => !envFields.has("provider") && handleProviderChange(p)}
                disabled={envFields.has("provider")}
                className={cn(
                  "rounded-[var(--radius-lg)] border px-3 py-2",
                  "text-sm font-semibold transition-all duration-150",
                  config.provider === p
                    ? "border-primary bg-primary text-primary-foreground shadow-[0_1px_3px_oklch(0.58_0.175_38/0.25)]"
                    : "border-border bg-card text-foreground hover:bg-secondary",
                  envFields.has("provider") && "cursor-not-allowed opacity-70",
                )}
              >
                {LLM_PROVIDERS[p].label}
              </button>
            ))}
          </div>
        </div>

        {/* Clé API */}
        {providerInfo.needsKey && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Label htmlFor="api-key">Clé API</Label>
              {envFields.has("apiKey") && <EnvBadge />}
            </div>
            <div className="relative">
              <Input
                id="api-key"
                type={showKey ? "text" : "password"}
                placeholder={envFields.has("apiKey") ? "Définie via variable d'environnement" : `Clé ${providerInfo.label}`}
                value={config.apiKey}
                onChange={(e) => setConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
                readOnly={envFields.has("apiKey")}
                className={cn("pr-10", envFields.has("apiKey") && "bg-secondary/40")}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showKey ? "Masquer la clé" : "Afficher la clé"}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}

        {/* Champs Ollama */}
        {config.provider === "ollama" && (
          <div className="space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="ollama-url">URL de l'instance Ollama</Label>
                {envFields.has("ollamaBaseUrl") && <EnvBadge />}
              </div>
              <Input
                id="ollama-url"
                type="text"
                placeholder="http://localhost:11434"
                value={config.ollamaBaseUrl}
                onChange={(e) => setConfig((prev) => ({ ...prev, ollamaBaseUrl: e.target.value }))}
                readOnly={envFields.has("ollamaBaseUrl")}
                className={cn(envFields.has("ollamaBaseUrl") && "bg-secondary/40")}
              />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="ollama-model">Modèle</Label>
              <Input
                id="ollama-model"
                type="text"
                placeholder="llama3.2, mistral, …"
                value={config.model}
                onChange={(e) => setConfig((prev) => ({ ...prev, model: e.target.value }))}
              />
            </div>
          </div>
        )}

        {/* Sélecteur de modèle */}
        {config.provider !== "ollama" && providerInfo.models.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Label>Modèle</Label>
              {envFields.has("model") && <EnvBadge />}
            </div>
            <div className="flex flex-wrap gap-2">
              {providerInfo.models.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => !envFields.has("model") && setConfig((prev) => ({ ...prev, model: m }))}
                  disabled={envFields.has("model")}
                  className={cn(
                    "rounded-[var(--radius-lg)] border px-3 py-1.5",
                    "text-xs font-mono font-semibold transition-all duration-150",
                    config.model === m
                      ? "border-primary/40 bg-primary/8 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Test de connexion */}
        <div className="flex items-center gap-3 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={testStatus.state === "loading" || (!config.apiKey && providerInfo.needsKey) || (config.provider === "ollama" && !config.ollamaBaseUrl)}
            className="gap-1.5"
          >
            {testStatus.state === "loading" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Tester la connexion
          </Button>
          {testStatus.state === "ok" && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-[oklch(0.50_0.14_145)] dark:text-[oklch(0.70_0.14_145)]">
              <CheckCircle2 className="h-4 w-4" />
              {testStatus.message}
            </span>
          )}
          {testStatus.state === "error" && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-destructive">
              <XCircle className="h-4 w-4" />
              {testStatus.message}
            </span>
          )}
          {saved && testStatus.state === "idle" && (
            <span className="text-xs text-muted-foreground animate-fade-in">Sauvegardé</span>
          )}
        </div>
      </section>

      {/* ── Section À propos ── */}
      <section className="rounded-[var(--radius-2xl)] border border-border/50 bg-card shadow-subtle p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] bg-primary/8">
            <Info className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold leading-none">À propos</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Informations sur l'application.</p>
          </div>
          <div className="flex items-center gap-2">
            <img src={`${getIngressBasename()}/bonap.png`} alt="Bonap" className="h-6 w-6 rounded-md object-cover" />
            <span className="text-sm font-semibold">
              <a href="https://bonap.aylabs.fr" target="_blank" rel="noopener noreferrer" title="Bonap">Bonap</a></span>
            <span className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-mono font-semibold text-muted-foreground">
              <a
                href={`https://github.com/AymericLeFeyer/bonap/releases/tag/v${__APP_VERSION__}`}
                target="_blank"
                rel="noopener noreferrer"
                title={`Bonap v${__APP_VERSION__}`}
              >
                v{__APP_VERSION__}
              </a>
            </span>
          </div>
        </div>
      </section>

      {/* ── Section Connexion Mealie ── */}
      <section className="rounded-[var(--radius-2xl)] border border-border/50 bg-card shadow-subtle space-y-5 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] bg-[oklch(0.93_0.05_160)] dark:bg-[oklch(0.22_0.04_160)]">
            <Server className="h-4 w-4 text-[oklch(0.48_0.14_160)] dark:text-[oklch(0.70_0.14_160)]" />
          </div>
          <div>
            <h2 className="text-base font-bold leading-none">Connexion Mealie</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Variables d'environnement (lecture seule).</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.10em]">VITE_MEALIE_URL</Label>
            <Input
              readOnly
              value={getEnv("VITE_MEALIE_URL") || "Non défini"}
              className="bg-secondary/40 font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.10em]">VITE_MEALIE_TOKEN</Label>
            <Input
              readOnly
              type="password"
              value={getEnv("VITE_MEALIE_TOKEN") || "Non défini"}
              className="bg-secondary/40 font-mono text-xs"
            />
          </div>
        </div>
      </section>
    </div>
  )
}
