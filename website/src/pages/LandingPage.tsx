import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Github,
  BookOpen,
  UtensilsCrossed,
  CalendarDays,
  ShoppingCart,
  Sparkles,
  MessageSquare,
  BarChart3,
  Home,
  Terminal,
  Server,
  ExternalLink,
  ArrowRight,
  Monitor,
  X,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

interface FeatureCard {
  icon: React.ReactNode
  title: string
  description: string
  gif: string
}

const features: FeatureCard[] = [
  {
    icon: <UtensilsCrossed size={22} />,
    title: 'Recettes',
    description: 'Grille avec recherche, filtres par catégorie, tag, durée et saison, scroll infini.',
    gif: '/demo/recettes.gif',
  },
  {
    icon: <CalendarDays size={22} />,
    title: 'Planning',
    description: 'Calendrier hebdomadaire (déjeuner + dîner), navigation fluide, raccourci restes.',
    gif: '/demo/planning.gif',
  },
  {
    icon: <ShoppingCart size={22} />,
    title: 'Liste de courses',
    description: 'Auto-remplie depuis le planning, groupée par label, liste "Habituels" persistante.',
    gif: '/demo/courses.gif',
  },
  {
    icon: <Sparkles size={22} />,
    title: 'Suggestions IA',
    description: '5 suggestions selon la saison, l\'historique et vos critères en texte libre.',
    gif: '/demo/suggestions.gif',
  },
  {
    icon: <MessageSquare size={22} />,
    title: 'Assistant IA',
    description: 'Drawer flottant : cherche des recettes, ajoute au planning, crée des recettes.',
    gif: '/demo/ia.gif',
  },
  {
    icon: <BarChart3 size={22} />,
    title: 'Statistiques',
    description: 'Top recettes, ingrédients fréquents, streak, % restes, couverture du catalogue.',
    gif: '/demo/stats.gif',
  },
]

interface InstallCard {
  icon: React.ReactNode
  title: string
  badge?: string
  badgeColor?: string
  description: string
  command?: string
  commandHref?: string
  to: string
  linkLabel: string
}

const installCards: InstallCard[] = [
  {
    icon: <Home size={20} />,
    title: 'Home Assistant',
    badge: 'Recommandé',
    badgeColor: 'var(--primary)',
    description: 'Si tu utilises déjà Home Assistant, installe Bonap comme addon — ingress inclus, aucun port à exposer.',
    command: 'github.com/AyLabsCode/aylabs-ha-addons',
    commandHref: 'https://github.com/AyLabsCode/aylabs-ha-addons',
    to: '/docs/installation/homeassistant',
    linkLabel: 'Guide HA →',
  },
  {
    icon: <Server size={20} />,
    title: 'Docker',
    description: 'Un seul conteneur, une seule commande. Compatible avec toute infrastructure Docker existante.',
    command: 'docker run -d -p 3000:80 \\\n  -e VITE_MEALIE_URL=... \\\n  -e VITE_MEALIE_TOKEN=... \\\n  ghcr.io/aymericlefeyer/bonap:latest',
    to: '/docs/installation/docker',
    linkLabel: 'Guide Docker →',
  },
  {
    icon: <Terminal size={20} />,
    title: 'Dev local',
    description: 'Clone le repo, crée un fichier `.env`, lance `npm run dev`. Le proxy Vite gère le CORS automatiquement.',
    command: 'git clone https://github.com/AymericLeFeyer/bonap\ncd bonap && npm install && npm run dev',
    to: '/docs/installation/dev',
    linkLabel: 'Guide dev →',
  },
]

function CodeBlock({ code }: { code: string }) {
  return (
    <pre style={{
      background: 'oklch(0.08 0.01 260)',
      border: '1px solid var(--border)',
      borderRadius: '6px',
      padding: '0.75rem 1rem',
      fontSize: '0.75rem',
      color: 'var(--primary-light)',
      overflowX: 'auto',
      margin: '0.75rem 0 0',
      lineHeight: 1.6,
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      <code>{code}</code>
    </pre>
  )
}

export default function LandingPage() {
  const [lightbox, setLightbox] = useState<FeatureCard | null>(null)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      {/* Hero */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8rem 1.5rem 4rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '400px',
          background: 'radial-gradient(ellipse, var(--primary-glow) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '720px' }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.875rem',
            borderRadius: '999px',
            border: '1px solid var(--primary-glow)',
            background: 'var(--primary-subtle)',
            color: 'var(--primary-light)',
            fontSize: '0.8rem',
            fontWeight: 600,
            letterSpacing: '0.02em',
            marginBottom: '2rem',
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#22c55e',
              display: 'inline-block',
              boxShadow: '0 0 6px #22c55e',
            }} />
            Open Source · Self-hosted · Home Assistant App
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: 'clamp(2.5rem, 6vw, 4rem)',
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            color: 'var(--text)',
            marginBottom: '1.5rem',
          }}>
            L'app ultime de
            <br />
            <span style={{ color: 'var(--primary)' }}>gestion des repas</span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: 'clamp(1rem, 2vw, 1.2rem)',
            color: 'var(--text-muted)',
            lineHeight: 1.7,
            maxWidth: '560px',
            margin: '0 auto 2.5rem',
          }}>
            Une interface moderne pour <strong style={{ color: 'var(--text)' }}>Mealie</strong> — recettes,
            planning, courses intelligentes et suggestions IA. Disponible sur <strong style={{ color: 'var(--text)' }}>Docker</strong> et nativement sur <strong style={{ color: 'var(--text)' }}>Home Assistant</strong>.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/docs"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.75rem',
                borderRadius: '8px',
                background: 'var(--primary)',
                color: 'white',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.95rem',
                transition: 'opacity 0.2s, transform 0.2s',
                boxShadow: '0 4px 20px var(--primary-glow)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <BookOpen size={18} />
              Voir la doc
            </Link>
            <a
              href="https://github.com/AymericLeFeyer/bonap"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.75rem',
                borderRadius: '8px',
                background: 'transparent',
                color: 'var(--text)',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.95rem',
                border: '1px solid var(--border)',
                transition: 'border-color 0.2s, transform 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <Github size={18} />
              GitHub
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: 'absolute',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          animation: 'bounce 2s infinite',
        }}>
          <ArrowRight size={20} color="var(--text-muted)" style={{ transform: 'rotate(90deg)' }} />
        </div>

        <style>{`
          @keyframes bounce {
            0%, 100% { transform: translateX(-50%) translateY(0); }
            50% { transform: translateX(-50%) translateY(8px); }
          }
        `}</style>
      </section>

      {/* Video */}
      <section style={{ padding: '5rem 1.5rem', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: 'var(--text)',
            marginBottom: '0.5rem',
          }}>
            Les origines de Bonap
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
            Découvrez les origines du projet, et comment il a été réalisé.
          </p>
        </div>
        <div style={{
          position: 'relative',
          paddingBottom: '56.25%',
          height: 0,
          borderRadius: '14px',
          overflow: 'hidden',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 40px oklch(0 0 0 / 0.3)',
        }}>
          <iframe
            src="https://www.youtube.com/embed/ShaX-RX7mG8"
            title="Bonap — présentation"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none',
            }}
          />
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ padding: '5rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: 'var(--text)',
            marginBottom: '0.75rem',
          }}>
            Tout ce dont vous avez besoin
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '480px', margin: '0 auto' }}>
            Une interface pensée pour le quotidien, connectée à votre Mealie.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1rem',
        }}>
          {features.map((feature) => (
            <div
              key={feature.title}
              onClick={() => setLightbox(feature)}
              style={{
                borderRadius: '12px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                transition: 'border-color 0.2s, background 0.2s, transform 0.2s',
                cursor: 'pointer',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement
                el.style.borderColor = 'var(--primary-glow)'
                el.style.background = 'var(--bg-card-hover)'
                el.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement
                el.style.borderColor = 'var(--border)'
                el.style.background = 'var(--bg-card)'
                el.style.transform = 'translateY(0)'
              }}
            >
              <img
                src={feature.gif}
                alt={feature.title}
                style={{ width: '100%', display: 'block', aspectRatio: '16/9', objectFit: 'cover' }}
              />
              <div style={{ padding: '1.25rem 1.5rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'var(--primary-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)',
                  marginBottom: '0.875rem',
                }}>
                  {feature.icon}
                </div>
                <h3 style={{
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: 'var(--text)',
                  marginBottom: '0.4rem',
                }}>
                  {feature.title}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'oklch(0 0 0 / 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              overflow: 'hidden',
              maxWidth: '1200px',
              width: '100%',
              boxShadow: '0 24px 80px oklch(0 0 0 / 0.5)',
            }}
          >
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'var(--primary-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
                flexShrink: 0,
              }}>
                {lightbox.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>{lightbox.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{lightbox.description}</div>
              </div>
              <button
                onClick={() => setLightbox(null)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  flexShrink: 0,
                }}
              >
                <X size={16} />
              </button>
            </div>
            <img
              src={lightbox.gif}
              alt={lightbox.title}
              style={{ width: '100%', display: 'block' }}
            />
          </div>
        </div>
      )}

      {/* Installation */}
      <section style={{
        padding: '5rem 1.5rem',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--text)',
              marginBottom: '0.75rem',
            }}>
              Démarrer en quelques minutes
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '480px', margin: '0 auto' }}>
              Choisissez votre méthode d'installation selon votre infrastructure.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1rem',
          }}>
            {installCards.map((card) => (
              <div
                key={card.title}
                style={{
                  padding: '1.5rem',
                  borderRadius: '12px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'var(--primary-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                    flexShrink: 0,
                  }}>
                    {card.icon}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
                      {card.title}
                    </h3>
                    {card.badge && (
                      <span style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: 'var(--primary-subtle)',
                        color: 'var(--primary)',
                        border: '1px solid var(--primary-glow)',
                      }}>
                        {card.badge}
                      </span>
                    )}
                  </div>
                </div>

                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                  {card.description}
                </p>

                {card.command && (
                  card.commandHref
                    ? <a href={card.commandHref} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}><CodeBlock code={card.command} /></a>
                    : <CodeBlock code={card.command} />
                )}

                <Link
                  to={card.to}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    color: 'var(--primary)',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    marginTop: 'auto',
                    transition: 'gap 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.gap = '0.625rem')}
                  onMouseLeave={(e) => (e.currentTarget.style.gap = '0.375rem')}
                >
                  {card.linkLabel}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Extras */}
      <section style={{ padding: '5rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: 'var(--text)',
            marginBottom: '0.75rem',
          }}>
            Plus loin avec Bonap
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '480px', margin: '0 auto' }}>
            Des ressources complémentaires pour enrichir votre expérience.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1rem',
        }}>
          {/* Mealie HA addon */}
          <div style={{
            padding: '1.75rem',
            borderRadius: '12px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            transition: 'border-color 0.2s, transform 0.2s',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLDivElement
            el.style.borderColor = 'var(--primary-glow)'
            el.style.transform = 'translateY(-2px)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLDivElement
            el.style.borderColor = 'var(--border)'
            el.style.transform = 'translateY(0)'
          }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: 'var(--primary-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--primary)',
              }}>
                <Home size={20} />
              </div>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
                Mealie sur Home Assistant
              </h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              Installe aussi Mealie directement sur ton HA via l'addon non-officiel AyLabs.
              Stack complète en quelques clics.
            </p>
            <a
              href="https://github.com/AyLabsCode/aylabs-ha-addons"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                color: 'var(--primary)',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              <ExternalLink size={14} />
              AyLabs HA Addons
            </a>
          </div>

          {/* TRMNL */}
          <div style={{
            padding: '1.75rem',
            borderRadius: '12px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            transition: 'border-color 0.2s, transform 0.2s',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLDivElement
            el.style.borderColor = 'var(--border)'
            el.style.transform = 'translateY(-2px)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLDivElement
            el.style.borderColor = 'var(--border)'
            el.style.transform = 'translateY(0)'
          }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div className="trmnl-icon-wrap" style={{
                width: '40px', height: '40px', borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Monitor size={20} color="currentColor" />
              </div>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
                Template TRMNL
              </h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              Affiche ton planning repas et le prochain repas sur ton écran e-ink TRMNL.
            </p>
            <Link
              to="/docs/extras/trmnl"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                color: 'var(--text-muted)',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              En savoir plus →
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
