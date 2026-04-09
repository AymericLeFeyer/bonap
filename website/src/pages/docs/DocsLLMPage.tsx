import { Sparkles } from 'lucide-react'
import { DocH1, DocH2, DocLead, Alert, DocsTable } from '../../components/docs/DocsComponents'

const providersRows = [
  { cells: ['Anthropic', 'Complet', 'Suggestions + assistant + streaming + tool use', 'claude-sonnet-4-6'] },
  { cells: ['OpenAI', 'Partiel', 'Suggestions + assistant (sans tools ni streaming)', 'gpt-4o, gpt-4o-mini'] },
  { cells: ['Google Gemini', 'Partiel', 'Suggestions + assistant (sans tools ni streaming)', 'gemini-2.5-flash'] },
  { cells: ['Mistral', 'Partiel', 'Suggestions + assistant (sans tools ni streaming)', 'mistral-large-latest'] },
  { cells: ['Perplexity', 'Partiel', 'Suggestions + assistant (sans tools ni streaming)', 'sonar-pro'] },
  { cells: ['OpenRouter', 'Partiel', 'Accès multi-providers via une seule clé', 'anthropic/claude-sonnet-4-6'] },
  { cells: ['Ollama', 'Partiel', 'Local (localhost:11434) — sans tools ni streaming', 'llama3.2, mistral...'] },
]

const featuresRows = [
  { cells: ['Suggestions IA', 'Tous les providers', 'Page Suggestions → 5 idées selon saison, historique et critères libres'] },
  { cells: ['Assistant IA (chat)', 'Tous les providers', 'Drawer flottant avec historique de conversation multi-tours'] },
  { cells: ['Streaming temps réel', 'Anthropic uniquement', "Réponses qui s'affichent mot par mot"] },
  { cells: ['Tool — Recherche recettes', 'Anthropic uniquement', "L'assistant interroge votre Mealie et présente les résultats dans le chat"] },
  { cells: ['Tool — Ajout au planning', 'Anthropic uniquement', "L'assistant ajoute une recette au planning à la date demandée"] },
  { cells: ['Tool — Création de recette', 'Anthropic uniquement', "L'assistant crée une recette complète dans Mealie (ingrédients, instructions)"] },
]

function ProviderBadge({ type }: { type: 'free' | 'paid' | 'freemium' }) {
  const styles = {
    free: { bg: 'oklch(0.94 0.08 145)', border: 'oklch(0.75 0.12 145)', color: 'oklch(0.35 0.12 145)', label: 'Gratuit' },
    paid: { bg: 'oklch(0.96 0.06 55)', border: 'oklch(0.78 0.10 55)', color: 'oklch(0.42 0.12 50)', label: 'Payant' },
    freemium: { bg: 'oklch(0.94 0.06 240)', border: 'oklch(0.75 0.10 240)', color: 'oklch(0.38 0.12 240)', label: 'Freemium' },
  }
  const s = styles[type]
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '0.15rem 0.6rem',
      borderRadius: '999px',
      background: s.bg,
      border: `1px solid ${s.border}`,
      color: s.color,
      fontSize: '0.72rem',
      fontWeight: 700,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
    }}>
      {s.label}
    </span>
  )
}

function ProviderCard({
  name,
  badge,
  pricing,
  url,
  urlLabel,
  steps,
  note,
}: {
  name: string
  badge: 'free' | 'paid' | 'freemium'
  pricing: string
  url: string
  urlLabel: string
  steps: string[]
  note?: string
}) {
  return (
    <div style={{
      borderRadius: '10px',
      border: '1px solid var(--border)',
      background: 'var(--bg-card)',
      marginBottom: '1.25rem',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.875rem 1.25rem',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>{name}</span>
          <ProviderBadge type={badge} />
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'var(--primary)',
            textDecoration: 'none',
            fontSize: '0.8rem',
            fontWeight: 600,
          }}
        >
          {urlLabel} →
        </a>
      </div>
      <div style={{ padding: '1rem 1.25rem' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '0.875rem', lineHeight: 1.6 }}>
          💰 {pricing}
        </p>
        <ol style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 2, margin: 0 }}>
          {steps.map((step, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: step }} />
          ))}
        </ol>
        {note && (
          <p style={{
            marginTop: '0.75rem',
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            background: 'var(--primary-subtle)',
            color: 'var(--primary-light)',
            fontSize: '0.82rem',
            lineHeight: 1.6,
          }}>
            {note}
          </p>
        )}
      </div>
    </div>
  )
}

export default function DocsLLMPage() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
          <Sparkles size={20} />
        </div>
        <DocH1>Configuration IA / LLM</DocH1>
      </div>

      <DocLead>
        Bonap intègre une couche IA qui alimente deux fonctionnalités : les <strong>Suggestions</strong>
        et l'<strong>Assistant</strong>. La configuration se fait dans Bonap → Paramètres,
        aucune clé API n'est envoyée au serveur — tout reste dans votre navigateur.
      </DocLead>

      <DocH2>Où configurer</DocH2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '1rem' }}>
        Dans Bonap, cliquez sur l'icône <strong style={{ color: 'var(--text)' }}>Paramètres</strong> dans la sidebar.
        Section <strong style={{ color: 'var(--text)' }}>Intelligence Artificielle</strong> :
      </p>
      <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 2.2, marginBottom: '1rem' }}>
        <li><strong style={{ color: 'var(--text)' }}>Provider</strong> — choisissez Anthropic, OpenAI, Google, Mistral, Perplexity, OpenRouter ou Ollama</li>
        <li><strong style={{ color: 'var(--text)' }}>Clé API</strong> — votre clé du provider choisi</li>
        <li><strong style={{ color: 'var(--text)' }}>Modèle</strong> — cliquez sur "Tester la connexion" pour charger automatiquement les modèles disponibles</li>
      </ul>

      <Alert type="info">
        Par défaut, la clé API est stockée dans le <strong>localStorage</strong> de votre navigateur.
        Elle n'est jamais envoyée au serveur Bonap — les appels LLM partent directement
        depuis votre navigateur vers le provider.
      </Alert>

      <DocH2>Configuration via variables d'environnement</DocH2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '1rem' }}>
        Pour partager la configuration IA entre tous vos appareils sans avoir à la re-saisir,
        définissez ces variables dans Docker ou l'addon Home Assistant.
        Elles ont la priorité sur le localStorage et les champs correspondants deviennent en lecture seule dans l'interface.
      </p>
      <DocsTable
        headers={['Variable', 'Description', 'Exemple']}
        rows={[
          { cells: ['LLM_PROVIDER', 'Fournisseur IA', 'anthropic'] },
          { cells: ['LLM_API_KEY', 'Clé API du provider', 'sk-ant-...'] },
          { cells: ['LLM_MODEL', 'Modèle à utiliser', 'claude-sonnet-4-6'] },
          { cells: ['LLM_OLLAMA_URL', 'URL Ollama (si provider=ollama)', 'http://ollama:11434'] },
        ]}
      />

      <DocH2>Providers supportés</DocH2>
      <DocsTable
        headers={['Provider', 'Support', 'Notes', 'Modèles conseillés']}
        rows={providersRows}
      />

      <DocH2>Fonctionnalités IA</DocH2>
      <DocsTable
        headers={['Fonctionnalité', 'Provider requis', 'Description']}
        rows={featuresRows}
      />

      <Alert type="tip">
        Tous les providers fonctionnent pour les Suggestions et le chat Assistant.
        Seul <strong>Anthropic</strong> débloque le <strong>streaming</strong> et les <strong>tools</strong>
        (actions directes dans Mealie depuis l'assistant).
      </Alert>

      <DocH2>Obtenir une clé API</DocH2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
        Chaque provider nécessite un compte et une clé API. Voici comment obtenir une clé pour chaque provider supporté par Bonap.
      </p>

      <ProviderCard
        name="Anthropic (Claude)"
        badge="paid"
        pricing="Aucun plan gratuit. Facturation à l'usage (pay-as-you-go) : environ 0,30 $ / million de tokens pour Claude Haiku, 3 $ pour Sonnet. Comptez ~0,01 $ par suggestion ou échange avec l'assistant."
        url="https://console.anthropic.com/"
        urlLabel="console.anthropic.com"
        steps={[
          'Créez un compte sur <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" style="color: var(--primary)">console.anthropic.com</a>',
          'Allez dans <strong>Settings → API Keys → Create Key</strong>',
          'Copiez la clé (format <code style="font-size:0.8em;background:var(--primary-subtle);color:var(--primary-light);padding:0 4px;border-radius:3px">sk-ant-api03-...</code>) — elle ne s\'affiche qu\'une fois',
          'Ajoutez du crédit dans <strong>Plans & Billing → Add Credits</strong> (minimum 5 $)',
          'Collez la clé dans Bonap → Paramètres → IA → Anthropic',
        ]}
        note="✦ Provider recommandé : c'est le seul à activer le streaming et les tools (l'assistant peut rechercher, planifier et créer des recettes directement)."
      />

      <ProviderCard
        name="OpenAI (GPT)"
        badge="paid"
        pricing="Facturation à l'usage. GPT-4o : ~2,50 $ / million de tokens. GPT-4o mini : ~0,15 $. Les nouveaux comptes reçoivent parfois un crédit de démarrage."
        url="https://platform.openai.com/api-keys"
        urlLabel="platform.openai.com"
        steps={[
          'Créez un compte sur <a href="https://platform.openai.com/" target="_blank" rel="noopener noreferrer" style="color: var(--primary)">platform.openai.com</a>',
          'Allez dans <strong>API Keys → Create new secret key</strong>',
          'Copiez la clé (format <code style="font-size:0.8em;background:var(--primary-subtle);color:var(--primary-light);padding:0 4px;border-radius:3px">sk-proj-...</code>)',
          'Ajoutez du crédit dans <strong>Billing → Add payment method</strong>',
          'Collez la clé dans Bonap → Paramètres → IA → OpenAI',
        ]}
      />

      <ProviderCard
        name="Google Gemini"
        badge="freemium"
        pricing="Niveau gratuit généreux via AI Studio (15 requêtes/min, 1 500/jour). Pour un usage intensif, activez la facturation via Google Cloud (~0,075 $ / million de tokens pour Flash)."
        url="https://aistudio.google.com/app/apikey"
        urlLabel="aistudio.google.com"
        steps={[
          'Connectez-vous sur <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" style="color: var(--primary)">aistudio.google.com</a> avec votre compte Google',
          'Cliquez sur <strong>Get API Key → Create API key</strong>',
          'Copiez la clé (format <code style="font-size:0.8em;background:var(--primary-subtle);color:var(--primary-light);padding:0 4px;border-radius:3px">AIza...</code>)',
          'Collez la clé dans Bonap → Paramètres → IA → Google',
        ]}
        note="Option la plus accessible : le plan gratuit suffit pour un usage personnel courant avec Bonap."
      />

      <ProviderCard
        name="Mistral"
        badge="freemium"
        pricing="Plan gratuit disponible (La Plateforme, accès aux modèles open-weight). Modèles premium payants à l'usage (~0,10 $ / million de tokens pour Mistral Small)."
        url="https://console.mistral.ai/"
        urlLabel="console.mistral.ai"
        steps={[
          'Créez un compte sur <a href="https://console.mistral.ai/" target="_blank" rel="noopener noreferrer" style="color: var(--primary)">console.mistral.ai</a>',
          'Allez dans <strong>API Keys → Create new key</strong>',
          'Copiez la clé',
          'Collez la clé dans Bonap → Paramètres → IA → Mistral',
        ]}
      />

      <ProviderCard
        name="Perplexity"
        badge="paid"
        pricing="Facturation à l'usage. Sonar : ~1 $ / million de tokens. Sonar Pro : ~3 $. Pas de plan gratuit pour l'API."
        url="https://www.perplexity.ai/settings/api"
        urlLabel="perplexity.ai/settings/api"
        steps={[
          'Créez un compte sur <a href="https://www.perplexity.ai/" target="_blank" rel="noopener noreferrer" style="color: var(--primary)">perplexity.ai</a>',
          'Allez dans <strong>Settings → API → Generate</strong>',
          'Ajoutez du crédit dans <strong>Billing</strong>',
          'Collez la clé dans Bonap → Paramètres → IA → Perplexity',
        ]}
      />

      <ProviderCard
        name="OpenRouter"
        badge="freemium"
        pricing="Agrégateur multi-providers. Certains modèles sont totalement gratuits (:free). Les modèles payants sont facturés au prix du provider d'origine. Idéal pour essayer plusieurs modèles avec une seule clé."
        url="https://openrouter.ai/keys"
        urlLabel="openrouter.ai"
        steps={[
          'Créez un compte sur <a href="https://openrouter.ai/" target="_blank" rel="noopener noreferrer" style="color: var(--primary)">openrouter.ai</a>',
          'Allez dans <strong>Keys → Create Key</strong>',
          'Copiez la clé (format <code style="font-size:0.8em;background:var(--primary-subtle);color:var(--primary-light);padding:0 4px;border-radius:3px">sk-or-v1-...</code>)',
          'Collez la clé dans Bonap → Paramètres → IA → OpenRouter',
        ]}
        note="Les modèles suffixés :free (ex: google/gemma-3-27b-it:free) sont gratuits sans limite de crédit. Parfait pour tester."
      />

      <ProviderCard
        name="Ollama (local)"
        badge="free"
        pricing="Totalement gratuit. Les modèles tournent sur votre machine. Nécessite un GPU ou un CPU récent pour des performances correctes."
        url="https://ollama.com/"
        urlLabel="ollama.com"
        steps={[
          'Installez Ollama depuis <a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer" style="color: var(--primary)">ollama.com/download</a>',
          'Téléchargez un modèle : <code style="font-size:0.8em;background:var(--primary-subtle);color:var(--primary-light);padding:0 4px;border-radius:3px">ollama pull llama3.2</code> (3 Go) ou <code style="font-size:0.8em;background:var(--primary-subtle);color:var(--primary-light);padding:0 4px;border-radius:3px">ollama pull mistral</code>',
          'Activez les CORS : <code style="font-size:0.8em;background:var(--primary-subtle);color:var(--primary-light);padding:0 4px;border-radius:3px">OLLAMA_ORIGINS=* ollama serve</code>',
          'Dans Bonap → Paramètres → IA → Ollama, entrez l\'URL : <code style="font-size:0.8em;background:var(--primary-subtle);color:var(--primary-light);padding:0 4px;border-radius:3px">http://localhost:11434</code>',
          'Dans le champ Modèle, saisissez le nom exact du modèle téléchargé',
        ]}
        note="Aucune donnée ne quitte votre réseau. Idéal pour une utilisation privée. Les performances dépendent de votre matériel."
      />

      <DocH2>Page Suggestions</DocH2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '0.75rem' }}>
        Accessible depuis la sidebar, la page Suggestions envoie au LLM :
      </p>
      <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 2 }}>
        <li>La <strong style={{ color: 'var(--text)' }}>saison actuelle</strong> (printemps, été, automne, hiver)</li>
        <li>Les <strong style={{ color: 'var(--text)' }}>recettes récemment planifiées</strong> (pour éviter les répétitions)</li>
        <li>Vos <strong style={{ color: 'var(--text)' }}>critères texte libres</strong> (ex : "rapide, végétarien, moins de 30 min")</li>
      </ul>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7, marginTop: '0.75rem' }}>
        Le LLM répond avec 5 suggestions parmi vos recettes Mealie, avec une justification pour chacune.
        Chaque suggestion peut être ajoutée directement au planning.
      </p>

      <DocH2>Assistant IA</DocH2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '0.75rem' }}>
        L'assistant est accessible via le bouton <strong style={{ color: 'var(--text)' }}>✨</strong> en bas à droite.
        Il maintient un historique multi-tours avec n'importe quel provider.
        Avec Anthropic, il peut exécuter des actions directement dans Mealie :
      </p>
      <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 2 }}>
        <li><strong style={{ color: 'var(--text)' }}>Rechercher une recette</strong> — "Trouve-moi une recette de risotto" <em>(Anthropic)</em></li>
        <li><strong style={{ color: 'var(--text)' }}>Ajouter au planning</strong> — "Mets le risotto aux champignons lundi soir" <em>(Anthropic)</em></li>
        <li><strong style={{ color: 'var(--text)' }}>Créer une recette</strong> — "Crée une recette de tarte aux pommes" <em>(Anthropic)</em></li>
      </ul>
    </div>
  )
}
