import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { getEnv, getIngressBasename } from "../../shared/utils/env.ts"
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2, Check, Sun, Moon, Monitor, Palette, Bot, Server, Info, Lock, AlertTriangle, LogOut, ExternalLink, Github, Globe, ChevronDown, Calendar, RefreshCw, Minus, Plus, Sliders } from "lucide-react"
import { Button } from "../components/ui/button.tsx"
import { Input } from "../components/ui/input.tsx"
import { Label } from "../components/ui/label.tsx"
import { llmConfigService, getLLMEnvFields } from "../../infrastructure/llm/LLMConfigService.ts"
import type { LLMConfig, LLMProvider } from "../../shared/types/llm.ts"
import { LLM_PROVIDERS } from "../../shared/types/llm.ts"
import { useTheme } from "../hooks/useTheme.ts"
import { usePlanningPreferences } from "../hooks/usePlanningPreferences.ts"
import { useFamilySize } from "../hooks/useFamilySize.ts"
import { useFeatureFlags } from "../hooks/useFeatureFlags.ts"
import { useDefaultHabituels } from "../hooks/useDefaultHabituels.ts"
import { ACCENT_COLORS } from "../../infrastructure/theme/ThemeService.ts"
import type { Theme } from "../../infrastructure/theme/ThemeService.ts"
import { cn } from "../../lib/utils.ts"
import { logoutUseCase } from "../../infrastructure/container.ts"

type TestStatus =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'ok'; message: string }
  | { state: 'error'; message: string }

function EnvBadge() {
  return (
    <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      env
    </span>
  )
}

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Clair', icon: Sun },
  { value: 'dark', label: 'Sombre', icon: Moon },
  { value: 'system', label: 'Système', icon: Monitor },
]

// ─── CollapsibleSection ───────────────────────────────────────────────────────

interface CollapsibleSectionProps {
  icon: React.ReactNode
  iconBg: string
  title: string
  subtitle: string | React.ReactNode
  defaultOpen?: boolean
  headerExtra?: React.ReactNode
  children: React.ReactNode
}

function CollapsibleSection({ icon, iconBg, title, subtitle, defaultOpen = false, headerExtra, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="rounded-[var(--radius-2xl)] border border-border/50 bg-card shadow-subtle overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-5 text-left hover:bg-secondary/30 transition-colors"
      >
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-lg)]", iconBg)}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold leading-none">{title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
        </div>
        {headerExtra && (
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            {headerExtra}
          </div>
        )}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      <div className={cn(
        "grid transition-all duration-200 ease-in-out",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
      )}>
        <div className="overflow-hidden">
          <div className="space-y-6 border-t border-border/40 px-5 pb-5 pt-5">
            {children}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── FeatureRow ───────────────────────────────────────────────────────────────

function FeatureRow({ label, description, enabled, onChange }: { label: string; description: string; enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 px-1">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${enabled ? "bg-primary" : "bg-input"}`}
      >
        <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${enabled ? "translate-x-4" : "translate-x-0"}`} />
      </button>
    </div>
  )
}

// ─── SettingsPage ─────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { theme, setTheme, accentColor, setAccentColor } = useTheme()
  const { showBreakfast, setShowBreakfast } = usePlanningPreferences()
  const { familySize, setFamilySize } = useFamilySize()
  const { flags, setFlag } = useFeatureFlags()
  const { enabled: defaultHabituelsEnabled, toggle: toggleDefaultHabituels } = useDefaultHabituels()
  const navigate = useNavigate()
  const [config, setConfig] = useState<LLMConfig>(() => llmConfigService.load())
  const envFields = getLLMEnvFields()
  const [showKey, setShowKey] = useState(false)
  const [testStatus, setTestStatus] = useState<TestStatus>({ state: 'idle' })
  const [saved, setSaved] = useState(false)
  const [availableModels, setAvailableModels] = useState<string[]>(
    () => LLM_PROVIDERS[config.provider]?.models ?? [],
  )
  const [isFetchingModels, setIsFetchingModels] = useState(false)

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
      model: info.models[0] ?? '',
    }))
    setAvailableModels(info.models)
    setTestStatus({ state: 'idle' })
    setShowKey(false)
  }

  const handleTest = async () => {
    setTestStatus({ state: 'loading' })
    const result = await llmConfigService.testConnection(config)
    setTestStatus(
      result.ok
        ? { state: 'ok', message: result.message }
        : { state: 'error', message: result.message },
    )
    if (result.ok) {
      setIsFetchingModels(true)
      try {
        const models = await llmConfigService.fetchModels(config)
        if (models.length > 0) {
          setAvailableModels(models)
          setConfig((prev) => ({
            ...prev,
            model: models.includes(prev.model) ? prev.model : models[0],
          }))
        }
      } finally {
        setIsFetchingModels(false)
      }
    }
  }

  const handleLogout = async () => {
    try {
      await logoutUseCase.execute()
    } catch {
      // ignore — always clear local state
    } finally {
      localStorage.removeItem('bonap-mealie-url')
      localStorage.removeItem('bonap-mealie-token')
      window.__ENV__ = undefined
      navigate('/login', { replace: true })
    }
  }

  const handleFetchModels = async () => {
    if (!config.ollamaBaseUrl) return
    setIsFetchingModels(true)
    try {
      const models = await llmConfigService.fetchModels(config)
      if (models.length > 0) {
        setAvailableModels(models)
        setConfig((prev) => ({
          ...prev,
          model: models.includes(prev.model) ? prev.model : models[0],
        }))
      }
    } finally {
      setIsFetchingModels(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold">Paramètres</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configuration de l'apparence et des connexions.
        </p>
      </div>

      {/* ── Apparence ── */}
      <CollapsibleSection
        icon={<Palette className="h-4 w-4 text-primary" />}
        iconBg="bg-primary/8"
        title="Apparence"
        subtitle="Thème et couleur d'accent"
      >
        <div className="space-y-2.5">
          <Label>Thème</Label>
          <div className="flex gap-2">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={cn(
                  'flex items-center gap-2 rounded-[var(--radius-lg)] border px-4 py-2.5',
                  'text-sm font-semibold transition-all duration-150',
                  theme === value
                    ? 'border-primary bg-primary text-primary-foreground shadow-[0_1px_3px_oklch(0.58_0.175_38/0.25)]'
                    : 'border-border bg-card text-foreground hover:bg-secondary',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label>Couleur principale</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sélectionnée :{' '}
              <span className="font-semibold text-foreground">
                {accentColor.name}
              </span>
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
                  'relative h-9 w-9 rounded-full',
                  'transition-all duration-150 hover:scale-110',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  accentColor.id === color.id &&
                    'ring-2 ring-offset-2 ring-foreground/25 scale-110',
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
      </CollapsibleSection>

      {/* ── Planning ── */}
      <CollapsibleSection
        icon={<Calendar className="h-4 w-4 text-[oklch(0.50_0.16_250)] dark:text-[oklch(0.72_0.16_250)]" />}
        iconBg="bg-[oklch(0.93_0.05_250)] dark:bg-[oklch(0.22_0.04_250)]"
        title="Planning"
        subtitle="Repas, foyer et options d'affichage"
      >
        <div className="space-y-2.5">
          <Label>Taille du foyer</Label>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setFamilySize(familySize - 1)}
              disabled={familySize <= 1}
              aria-label="Diminuer la taille du foyer"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              min={1}
              max={99}
              value={familySize}
              onChange={(e) => setFamilySize(Number(e.target.value || 1))}
              className="w-24 text-center font-semibold"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setFamilySize(familySize + 1)}
              disabled={familySize >= 99}
              aria-label="Augmenter la taille du foyer"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">personnes</span>
          </div>
        </div>

        <div className="divide-y divide-border">
          <div className="flex items-center justify-between py-3 px-1">
            <div>
              <p className="text-sm font-medium">Petit-déjeuner</p>
              <p className="text-xs text-muted-foreground">
                Afficher et planifier le petit-déjeuner dans le planning
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={showBreakfast}
              onClick={() => setShowBreakfast(!showBreakfast)}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
                "transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                showBreakfast ? "bg-primary" : "bg-input",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-lg",
                  "transform transition-transform duration-200",
                  showBreakfast ? "translate-x-4" : "translate-x-0",
                )}
              />
            </button>
          </div>
          <FeatureRow
            label="Système de portions"
            description="Permet d'ajuster le nombre de portions dans le planning"
            enabled={flags.servings}
            onChange={(v) => setFlag("servings", v)}
          />
          <FeatureRow
            label="Auto-planification"
            description="Suggère automatiquement des recettes pour compléter la semaine"
            enabled={flags.autoPlan}
            onChange={(v) => setFlag("autoPlan", v)}
          />
        </div>
      </CollapsibleSection>

      {/* ── Recettes ── */}
      <CollapsibleSection
        icon={<Sliders className="h-4 w-4 text-[oklch(0.50_0.14_160)] dark:text-[oklch(0.72_0.14_160)]" />}
        iconBg="bg-[oklch(0.93_0.04_160)] dark:bg-[oklch(0.22_0.04_160)]"
        title="Recettes"
        subtitle="Options d'affichage des recettes"
      >
        <div className="divide-y divide-border">
          <FeatureRow
            label="Calcul nutritionnel"
            description="Affiche les calories et protéines sur les recettes"
            enabled={flags.nutrition}
            onChange={(v) => setFlag("nutrition", v)}
          />
        </div>
      </CollapsibleSection>

      {/* ── Liste de courses ── */}
      <CollapsibleSection
        icon={<span className="text-base leading-none">🛒</span>}
        iconBg="bg-[oklch(0.93_0.05_145)] dark:bg-[oklch(0.22_0.04_145)]"
        title="Liste de courses"
        subtitle="Habituels et catalogue par défaut"
      >
        <div className="divide-y divide-border">
          <FeatureRow
            label="Catalogue par défaut"
            description="Affiche un catalogue d'articles suggérés dans la section Habituels"
            enabled={defaultHabituelsEnabled}
            onChange={toggleDefaultHabituels}
          />
        </div>
      </CollapsibleSection>

      {/* ── Fournisseur IA ── */}
      <CollapsibleSection
        icon={<Bot className="h-4 w-4 text-[oklch(0.50_0.14_290)] dark:text-[oklch(0.72_0.14_290)]" />}
        iconBg="bg-[oklch(0.93_0.04_290)] dark:bg-[oklch(0.22_0.04_290)]"
        title="Fournisseur IA"
        subtitle={envFields.size > 0 ? "Certains paramètres via variables d'environnement" : `${LLM_PROVIDERS[config.provider].label} — ${config.model || 'non configuré'}`}
        headerExtra={
          <a
            href="https://bonap.aylabs.fr/docs/configuration/llm"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Aide
          </a>
        }
      >
        {/* Bannière localStorage */}
        {envFields.size === 0 && (
          <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              Ces paramètres sont <span className="font-semibold">stockés localement</span> sur cet appareil uniquement.
              Pour les appliquer sur tous vos appareils, définissez les variables d'environnement dans votre{" "}
              <span className="font-semibold">docker-compose.yml</span> ou la{" "}
              <span className="font-semibold">configuration de l'addon Home Assistant</span>, puis redémarrez.
            </p>
          </div>
        )}

        {/* Bannière env */}
        {envFields.size > 0 && (
          <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-border bg-secondary/50 px-4 py-3">
            <Lock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Les champs marqués{' '}
              <span className="font-semibold text-foreground">ENV</span> sont
              verrouillés. Pour les modifier, mettez à jour les variables
              d'environnement dans la{' '}
              <span className="font-semibold text-foreground">
                configuration de l'addon Home Assistant
              </span>{' '}
              ou votre{' '}
              <span className="font-semibold text-foreground">
                docker-compose.yml
              </span>
              , puis redémarrez.
            </p>
          </div>
        )}

        {/* Sélecteur de fournisseur */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <Label>Fournisseur</Label>
            {envFields.has('provider') && <EnvBadge />}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(LLM_PROVIDERS) as LLMProvider[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() =>
                  !envFields.has('provider') && handleProviderChange(p)
                }
                disabled={envFields.has('provider')}
                className={cn(
                  'rounded-[var(--radius-lg)] border px-3 py-2',
                  'text-sm font-semibold transition-all duration-150',
                  config.provider === p
                    ? 'border-primary bg-primary text-primary-foreground shadow-[0_1px_3px_oklch(0.58_0.175_38/0.25)]'
                    : 'border-border bg-card text-foreground hover:bg-secondary',
                  envFields.has('provider') && 'cursor-not-allowed opacity-70',
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
              {envFields.has('apiKey') && <EnvBadge />}
              <a
                href="https://bonap.aylabs.fr/docs/configuration/llm"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Comment obtenir une clé ?
              </a>
            </div>
            <div className="relative">
              <Input
                id="api-key"
                type={showKey ? 'text' : 'password'}
                placeholder={
                  envFields.has('apiKey')
                    ? "Définie via variable d'environnement"
                    : `Clé ${providerInfo.label}`
                }
                value={config.apiKey}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, apiKey: e.target.value }))
                }
                readOnly={envFields.has('apiKey')}
                className={cn(
                  'pr-10',
                  envFields.has('apiKey') && 'bg-secondary/40',
                )}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showKey ? 'Masquer la clé' : 'Afficher la clé'}
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Champs Ollama */}
        {config.provider === 'ollama' && (
          <div className="space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="ollama-url">URL de l'instance Ollama</Label>
                {envFields.has('ollamaBaseUrl') && <EnvBadge />}
              </div>
              <Input
                id="ollama-url"
                type="text"
                placeholder="http://localhost:11434"
                value={config.ollamaBaseUrl}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    ollamaBaseUrl: e.target.value,
                  }))
                }
                readOnly={envFields.has('ollamaBaseUrl')}
                className={cn(
                  envFields.has('ollamaBaseUrl') && 'bg-secondary/40',
                )}
              />
              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleFetchModels}
                  disabled={isFetchingModels || !config.ollamaBaseUrl}
                  className="gap-1.5"
                  title="Récupérer la liste des modèles depuis Ollama"
                >
                  {isFetchingModels ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  Récupérer les modèles
                </Button>
                <span className="text-xs text-muted-foreground">
                  Utilise l'URL ci-dessus pour appeler <code className="rounded bg-secondary px-1 py-0.5">/api/tags</code>.
                </span>
              </div>
            </div>

            {availableModels.length === 0 && (
              <div className="space-y-2.5">
                <Label htmlFor="ollama-model">Modèle</Label>
                <Input
                  id="ollama-model"
                  type="text"
                  placeholder="llama3.2, mistral, …"
                  value={config.model}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, model: e.target.value }))
                  }
                />
              </div>
            )}
          </div>
        )}

        {/* Sélecteur de modèle */}
        {availableModels.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Label>Modèle</Label>
              {envFields.has('model') && <EnvBadge />}
              {isFetchingModels && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {availableModels.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() =>
                    !envFields.has('model') &&
                    setConfig((prev) => ({ ...prev, model: m }))
                  }
                  disabled={envFields.has('model')}
                  className={cn(
                    'rounded-[var(--radius-lg)] border px-3 py-1.5',
                    'text-xs font-mono font-semibold transition-all duration-150',
                    config.model === m
                      ? 'border-primary/40 bg-primary/8 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground',
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
            disabled={
              testStatus.state === 'loading' ||
              (!config.apiKey && providerInfo.needsKey) ||
              (config.provider === 'ollama' && !config.ollamaBaseUrl)
            }
            className="gap-1.5"
          >
            {testStatus.state === 'loading' && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}
            Tester la connexion
          </Button>
          {testStatus.state === 'ok' && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-[oklch(0.50_0.14_145)] dark:text-[oklch(0.70_0.14_145)]">
              <CheckCircle2 className="h-4 w-4" />
              {testStatus.message}
            </span>
          )}
          {testStatus.state === 'error' && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-destructive">
              <XCircle className="h-4 w-4" />
              {testStatus.message}
              {' — '}
              <a
                href="https://bonap.aylabs.fr/docs/configuration/llm"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
              >
                Aide à la configuration
              </a>
            </span>
          )}
          {saved && testStatus.state === 'idle' && (
            <span className="text-xs text-muted-foreground animate-fade-in">
              Sauvegardé
            </span>
          )}
        </div>
      </CollapsibleSection>

      {/* ── Connexion Mealie ── */}
      <CollapsibleSection
        icon={<Server className="h-4 w-4 text-[oklch(0.48_0.14_160)] dark:text-[oklch(0.70_0.14_160)]" />}
        iconBg="bg-[oklch(0.93_0.05_160)] dark:bg-[oklch(0.22_0.04_160)]"
        title="Connexion Mealie"
        subtitle="Variables d'environnement (lecture seule)"
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.10em]">
              VITE_MEALIE_URL
            </Label>
            <Input
              readOnly
              value={getEnv('VITE_MEALIE_URL') || 'Non défini'}
              className="bg-secondary/40 font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.10em]">
              VITE_MEALIE_TOKEN
            </Label>
            <Input
              readOnly
              type="password"
              value={getEnv('VITE_MEALIE_TOKEN') || 'Non défini'}
              className="bg-secondary/40 font-mono text-xs"
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* ── Déconnexion ── */}
      {import.meta.env.VITE_PROTECTED_ROUTE === 'true' && (
        <CollapsibleSection
          icon={<LogOut className="h-4 w-4 text-destructive" />}
          iconBg="bg-destructive/8"
          title="Déconnexion"
          subtitle="Déconnecter le compte actuellement connecté"
        >
          <Button variant="destructive" onClick={handleLogout}>
            Se déconnecter
          </Button>
        </CollapsibleSection>
      )}

      {/* ── À propos ── */}
      <CollapsibleSection
        icon={<Info className="h-4 w-4 text-primary" />}
        iconBg="bg-primary/8"
        title="À propos"
        subtitle={`Bonap v${__APP_VERSION__} — par AyLabs`}
      >
        <div className="flex items-center gap-2">
          <img src={`${getIngressBasename()}/bonap.png`} alt="Bonap" className="h-6 w-6 rounded-md object-cover" />
          <span className="text-sm font-semibold">Bonap</span>
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

        <div className="flex flex-wrap gap-2">
          <a
            href="https://bonap.aylabs.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-[var(--radius-lg)] border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
          >
            <Globe className="h-3.5 w-3.5" />
            bonap.aylabs.fr
          </a>
          <a
            href="https://github.com/AymericLeFeyer/bonap"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-[var(--radius-lg)] border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
          >
            <Github className="h-3.5 w-3.5" />
            AymericLeFeyer/bonap
          </a>
          <a
            href="https://aylabs.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-[var(--radius-lg)] border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            AyLabs
          </a>
        </div>
      </CollapsibleSection>
    </div>
  )
}
