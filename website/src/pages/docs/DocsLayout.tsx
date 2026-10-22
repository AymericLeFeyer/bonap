import { Outlet, Link } from 'react-router-dom'
import { Github } from 'lucide-react'
import DocsSidebar from '../../components/docs/DocsSidebar'
import ThemeToggle from '../../components/ThemeToggle'
import { useWebsiteTheme } from '../../hooks/useWebsiteTheme'

export default function DocsLayout() {
  const { theme, toggle } = useWebsiteTheme()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Docs Navbar */}
      <header data-ay-section="docs-header" style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)',
        backdropFilter: 'blur(12px)',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
      }}>
        <nav style={{
          maxWidth: '100%',
          width: '100%',
          padding: '0 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
              <img src="/bonap.png" alt="Bonap" width={28} height={28} style={{ borderRadius: '7px' }} />
            </Link>
            <span style={{
              color: 'var(--border)',
              fontSize: '1.25rem',
              fontWeight: 300,
              lineHeight: 1,
            }}>/</span>
            <Link
              to="/docs"
              style={{
                fontWeight: 600,
                fontSize: '0.95rem',
                color: 'var(--text-muted)',
                textDecoration: 'none',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              Docs
            </Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <ThemeToggle theme={theme} onToggle={toggle} />
            <a
              href="https://github.com/AymericLeFeyer/bonap"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                color: 'var(--text-muted)',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: 500,
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <Github size={15} />
              GitHub
            </a>
          </div>
        </nav>
      </header>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1 }}>
        <DocsSidebar />
        <main data-ay-section="docs-content" style={{
          flex: 1,
          minWidth: 0,
          padding: '2.5rem 2rem 4rem',
          maxWidth: '860px',
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
