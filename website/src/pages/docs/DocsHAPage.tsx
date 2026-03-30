import { Home } from 'lucide-react'
import { DocH1, DocH2, DocLead, CodeBlock, Alert, Step, InlineCode } from '../../components/docs/DocsComponents'

const repoUrl = 'https://github.com/AyLabsCode/aylabs-ha-addons'

const configYaml = `mealie_url: "http://your-mealie-host:9000"
mealie_token: "your_api_token"`

export default function DocsHAPage() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
          <Home size={20} />
        </div>
        <DocH1>Installation Home Assistant</DocH1>
      </div>

      <DocLead>
        Bonap est disponible comme addon Home Assistant via le dépôt <strong>AyLabs</strong>.
        Ce même dépôt propose aussi un addon Mealie — vous pouvez donc avoir une stack
        complète (Mealie + Bonap) directement sur votre instance HA.
      </DocLead>

      <Alert type="info">
        Prérequis : Home Assistant OS ou Supervised. Les installations Home Assistant Core et
        Container ne supportent pas les addons.
      </Alert>

      <div style={{
        position: 'relative',
        paddingBottom: '56.25%',
        height: 0,
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid var(--border)',
        marginBottom: '2rem',
        boxShadow: '0 4px 24px oklch(0 0 0 / 0.25)',
      }}>
        <iframe
          src="https://www.youtube.com/embed/8LAQWVm24nI"
          title="Bonap — installation Home Assistant"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
        />
      </div>

      <DocH2>Étape 1 — Ajouter le dépôt AyLabs</DocH2>

      <Step number={1} title="Ouvrir la boutique d'addons">
        Dans Home Assistant : <strong style={{ color: 'var(--text)' }}>Paramètres</strong> →{' '}
        <strong style={{ color: 'var(--text)' }}>Modules complémentaires</strong> →{' '}
        <strong style={{ color: 'var(--text)' }}>Boutique de modules complémentaires</strong>
      </Step>

      <Step number={2} title="Ajouter le dépôt AyLabs">
        Cliquez sur le menu <strong style={{ color: 'var(--text)' }}>3 points</strong> (haut à droite)
        → <strong style={{ color: 'var(--text)' }}>Dépôts</strong> → ajoutez :
        <CodeBlock code={repoUrl} language="text" />
        Rechargez la page. Vous verrez apparaître les addons <strong style={{ color: 'var(--text)' }}>Bonap</strong> et <strong style={{ color: 'var(--text)' }}>Mealie</strong> dans la boutique.
      </Step>

      <Alert type="tip">
        Ce dépôt contient deux addons : <strong>Bonap</strong> (l'interface) et <strong>Mealie</strong>
        (le gestionnaire de recettes). Si vous n'avez pas encore Mealie, installez-le en premier —
        voir <a href="/docs/extras/mealie-addon" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Addon Mealie pour HA</a>.
      </Alert>

      <DocH2>Étape 2 — Avoir une instance Mealie</DocH2>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '1rem' }}>
        Bonap est une interface pour Mealie — vous avez besoin d'une instance Mealie accessible avant de continuer.
      </p>

      <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem 1.25rem', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '0.35rem', fontSize: '0.9rem' }}>
            Option A — Installer Mealie via l'addon AyLabs <span style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 600 }}>Recommandé</span>
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.6 }}>
            Le dépôt AyLabs contient aussi un addon Mealie. Cherchez "Mealie" dans la boutique, installez-le (port 9000 par défaut).{' '}
            <a href="/docs/extras/mealie-addon" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Guide complet →</a>
          </p>
        </div>
        <div style={{ padding: '1rem 1.25rem', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '0.35rem', fontSize: '0.9rem' }}>Option B — Mealie déjà installé ailleurs</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.6 }}>
            Notez l'URL de votre instance (ex: <InlineCode>http://192.168.1.10:9000</InlineCode>), vous en aurez besoin à la configuration.{' '}
            <a href="https://mealie.io" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Site officiel Mealie →</a>
          </p>
        </div>
      </div>

      <DocH2>Étape 3 — Installer Bonap</DocH2>

      <Step number={3} title="Trouver et installer l'addon Bonap">
        Cherchez <strong style={{ color: 'var(--text)' }}>"Bonap"</strong> dans la boutique →
        cliquez sur l'addon → <strong style={{ color: 'var(--text)' }}>Installer</strong>.
        Attendez la fin de l'installation.
      </Step>

      <DocH2>Étape 4 — Configurer</DocH2>

      <Step number={4} title="Renseigner la configuration">
        Dans l'onglet <strong style={{ color: 'var(--text)' }}>Configuration</strong> de l'addon :
        <CodeBlock code={configYaml} language="yaml" />
        Remplacez les valeurs par votre URL Mealie et votre token API.
      </Step>

      <Step number={5} title="Démarrer l'addon">
        Cliquez sur <strong style={{ color: 'var(--text)' }}>Démarrer</strong> dans l'onglet{' '}
        <strong style={{ color: 'var(--text)' }}>Informations</strong>.
      </Step>

      <Step number={6} title="Accéder à Bonap">
        Deux options :
        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', lineHeight: 2 }}>
          <li>Bouton <strong style={{ color: 'var(--text)' }}>OPEN WEB UI</strong> dans l'onglet Informations</li>
          <li>Activer <strong style={{ color: 'var(--text)' }}>Afficher dans la barre latérale</strong> pour un accès rapide depuis HA</li>
        </ul>
      </Step>

      <Alert type="tip">
        Bonap supporte l'ingress Home Assistant. Quand vous accédez via l'interface HA,
        les requêtes sont automatiquement routées sans configuration réseau supplémentaire.
      </Alert>

      <DocH2>Générer un token Mealie</DocH2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>
        Si vous n'avez pas encore de token :
      </p>
      <ol style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 2 }}>
        <li>Ouvrez votre instance Mealie</li>
        <li>Profil (avatar en bas à gauche) → <strong style={{ color: 'var(--text)' }}>API Tokens</strong></li>
        <li>Créer un token → copiez-le</li>
      </ol>

      <DocH2>Mise à jour</DocH2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>
        Les mises à jour apparaissent automatiquement dans la boutique d'addons HA.
        Votre configuration (<InlineCode>mealie_url</InlineCode> et <InlineCode>mealie_token</InlineCode>)
        est conservée entre les mises à jour.
      </p>
    </div>
  )
}
