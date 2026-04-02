import { Settings } from 'lucide-react'
import { DocH1, DocH2, DocLead, Alert, DocsTable, InlineCode } from '../../components/docs/DocsComponents'

const envVarsRows = [
  {
    cells: [
      'VITE_MEALIE_URL',
      'Oui',
      "URL de Mealie. En Docker full-stack, utiliser le nom du service (ex: http://mealie:9000). En Docker simple, l'URL externe suffit.",
    ],
  },
  {
    cells: [
      'VITE_MEALIE_TOKEN',
      'Oui',
      'Token Bearer Mealie (Profil → API Tokens)',
    ],
  },
]

const llmProviders = [
  {
    cells: ['Anthropic', 'Recommandé', 'Streaming + tool use complet (Claude 3.x)'],
  },
  {
    cells: ['OpenAI', 'Partiel', 'Sans streaming, sans tools (GPT-4o, GPT-4)'],
  },
  {
    cells: ['Google Gemini', 'Partiel', 'Sans streaming, sans tools'],
  },
  {
    cells: ['Ollama', 'Partiel', 'Local (localhost:11434), sans tools'],
  },
]

export default function DocsConfigPage() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px',
          background: 'var(--primary-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--primary)', flexShrink: 0,
        }}>
          <Settings size={20} />
        </div>
        <DocH1>Configuration</DocH1>
      </div>

      <DocLead>
        Bonap se configure via des variables d'environnement pour la connexion Mealie,
        et via l'interface utilisateur pour les fonctionnalités IA.
      </DocLead>

      <DocH2>Variables d'environnement</DocH2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '0.75rem' }}>
        Ces variables sont nécessaires au démarrage. Pour Docker, elles se passent via{' '}
        <InlineCode>-e</InlineCode> ou dans le fichier Compose. Pour le dev local, via le fichier{' '}
        <InlineCode>.env</InlineCode> à la racine.
      </p>

      <DocsTable
        headers={['Variable', 'Requis', 'Description']}
        rows={envVarsRows}
      />

      <Alert type="warning">
        Les variables préfixées <InlineCode>VITE_</InlineCode> sont embarquées dans le bundle
        JavaScript au moment du build. Ne mettez jamais de secrets sensibles dans ces variables
        si votre instance est publique.
      </Alert>

      <Alert type="info">
        <InlineCode>MEALIE_INTERNAL_URL</InlineCode> est utile en Docker Compose quand Mealie et
        Bonap sont sur le même réseau Docker. Bonap utilise ce nom interne (ex:{' '}
        <InlineCode>http://mealie:9000</InlineCode>) pour le proxy nginx, tandis que{' '}
        <InlineCode>VITE_MEALIE_URL</InlineCode> reste l'URL publique pour le navigateur.
      </Alert>

      <DocH2>Configuration LLM / IA</DocH2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '0.75rem' }}>
        La configuration LLM se fait directement dans Bonap → <strong style={{ color: 'var(--text)' }}>Paramètres</strong>.
        Elle est stockée dans le localStorage du navigateur (aucun secret envoyé au serveur).
      </p>

      <DocsTable
        headers={['Provider', 'Support', 'Notes']}
        rows={llmProviders}
      />

      <Alert type="tip">
        Pour l'assistant IA complet (streaming + tool use : recherche de recettes, ajout au planning,
        création de recettes), seul <strong style={{ color: 'var(--text)' }}>Anthropic</strong> est
        pleinement supporté. Les autres providers fonctionnent pour les suggestions simples mais sans
        les tools de l'assistant.
      </Alert>

      <DocH2>Thème et personnalisation</DocH2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>
        Dans Bonap → <strong style={{ color: 'var(--text)' }}>Paramètres</strong> → section Apparence :
      </p>
      <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 2 }}>
        <li><strong style={{ color: 'var(--text)' }}>Mode</strong> : clair, sombre, ou système</li>
        <li><strong style={{ color: 'var(--text)' }}>Couleur d'accent</strong> : 8 options prédéfinies (stockée en localStorage)</li>
      </ul>
    </div>
  )
}
