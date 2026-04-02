import { Server } from 'lucide-react'
import { DocH1, DocH2, DocLead, CodeBlock, Alert, Step, InlineCode } from '../../components/docs/DocsComponents'

const dockerRunCmd = `docker run -d \\
  -p 3000:80 \\
  -e VITE_MEALIE_URL=http://your-mealie-host:9000 \\
  -e VITE_MEALIE_TOKEN=your_api_token \\
  --name bonap \\
  --restart unless-stopped \\
  ghcr.io/aymericlefeyer/bonap:latest`

const dockerComposeCmd = `# docker-compose.full.yml
version: "3.8"
services:
  mealie:
    image: ghcr.io/mealie-recipes/mealie:latest
    ports:
      - "9000:9000"
    environment:
      - BASE_URL=http://localhost:9000
    volumes:
      - mealie-data:/app/data
    restart: unless-stopped

  bonap:
    image: ghcr.io/aymericlefeyer/bonap:latest
    ports:
      - "3000:80"
    environment:
      - VITE_MEALIE_URL=http://mealie:9000
      - VITE_MEALIE_TOKEN=your_api_token
    depends_on:
      - mealie
    restart: unless-stopped

volumes:
  mealie-data:`

export default function DocsDockerPage() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px',
          background: 'var(--primary-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--primary)', flexShrink: 0,
        }}>
          <Server size={20} />
        </div>
        <DocH1>Installation Docker</DocH1>
      </div>

      <DocLead>
        Deux options selon votre situation : Bonap seul (si Mealie est déjà en place) ou une stack complète
        Bonap + Mealie avec Docker Compose.
      </DocLead>

      <DocH2>Option A — Bonap seul</DocH2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '0.5rem' }}>
        Si Mealie est déjà installé et accessible, lancez simplement le conteneur Bonap :
      </p>

      <CodeBlock code={dockerRunCmd} language="bash" />

      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>
        Ouvrez ensuite <InlineCode>http://localhost:3000</InlineCode> dans votre navigateur.
      </p>

      <Alert type="warning">
        <InlineCode>VITE_MEALIE_URL</InlineCode> doit être l'URL accessible depuis votre navigateur,
        pas depuis le conteneur. En Docker standalone, utilisez l'IP de l'hôte ou le nom DNS de votre Mealie.
      </Alert>

      <DocH2>Option B — Stack complète (Bonap + Mealie)</DocH2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '0.5rem' }}>
        Si vous partez de zéro, utilisez ce Docker Compose pour lancer Mealie et Bonap ensemble :
      </p>

      <CodeBlock code={dockerComposeCmd} language="yaml" />

      <DocH2>Étapes post-install (Option B)</DocH2>

      <Step number={1} title="Créer un compte admin Mealie">
        Ouvrez <InlineCode>http://localhost:9000</InlineCode> et créez votre compte administrateur.
      </Step>

      <Step number={2} title="Générer un token API">
        Connectez-vous → Profil → <strong style={{ color: 'var(--text)' }}>API Tokens</strong> → créez un nouveau token.
        Copiez-le.
      </Step>

      <Step number={3} title="Mettre à jour la configuration">
        Dans votre <InlineCode>docker-compose.full.yml</InlineCode>, remplacez{' '}
        <InlineCode>your_api_token</InlineCode> par le token copié.
      </Step>

      <Step number={4} title="Redémarrer Bonap">
        <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem', color: 'var(--primary-light)' }}>
          docker compose restart bonap
        </code>
        <br />
        Bonap est maintenant accessible sur <InlineCode>http://localhost:3000</InlineCode>.
      </Step>

      <DocH2>Images disponibles</DocH2>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        padding: '1rem',
        borderRadius: '8px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        fontSize: '0.875rem',
      }}>
        {[
          {
            tag: 'ghcr.io/aymericlefeyer/bonap:latest',
            desc: 'Build stable — branche main',
          },
          {
            tag: 'ghcr.io/aymericlefeyer/bonap:<sha>',
            desc: 'Version spécifique par SHA de commit',
          },
        ].map((img) => (
          <div key={img.tag} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
            <code style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.8rem',
              color: 'var(--primary-light)',
              background: 'var(--primary-subtle)',
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
              whiteSpace: 'nowrap',
            }}>
              {img.tag}
            </code>
            <span style={{ color: 'var(--text-muted)' }}>{img.desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
