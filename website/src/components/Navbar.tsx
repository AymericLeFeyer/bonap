import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Github, Menu, X } from 'lucide-react'
import { useWebsiteTheme } from '../hooks/useWebsiteTheme'
import ThemeToggle from './ThemeToggle'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, toggle } = useWebsiteTheme()
  const handleNavigate = () => setMobileOpen(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navBg = scrolled
    ? theme === 'dark'
      ? 'oklch(0.10 0.01 260 / 0.95)'
      : 'oklch(0.97 0.005 260 / 0.95)'
    : 'transparent'

  return (
    <header data-ay-section="navbar" style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      transition: 'all 0.3s ease',
      backgroundColor: navBg,
      borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
    }}>
      <nav style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <Link to="/" onClick={handleNavigate} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
            <img src="/bonap.png" alt="Bonap" width={32} height={32} style={{ display: 'block', borderRadius: '8px' }} />
            <span style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--text)' }}>Bonap</span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }} className="hidden-mobile">
            <Link to="/docs" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, transition: 'color 0.2s' }}
              onClick={handleNavigate}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
              Documentation
            </Link>
            <a href="https://github.com/AymericLeFeyer/bonap" target="_blank" rel="noopener noreferrer"
              onClick={handleNavigate}
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, transition: 'color 0.2s' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
              <Github size={16} />GitHub
            </a>
            <ThemeToggle theme={theme} onToggle={toggle} />
            <Link to="/docs" style={{ padding: '0.5rem 1rem', borderRadius: '6px', background: 'var(--primary)', color: 'white', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, transition: 'opacity 0.2s' }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}>
              Commencer
            </Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} className="show-mobile">
            <ThemeToggle theme={theme} onToggle={toggle} />
            <button onClick={() => setMobileOpen(!mobileOpen)}
              style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: '0.25rem' }}
              aria-label="Menu">
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div style={{ borderTop: '1px solid var(--border)', padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link to="/docs" style={{ color: 'var(--text-muted)', textDecoration: 'none', padding: '0.5rem 0', fontWeight: 500 }}>Documentation</Link>
            <a href="https://github.com/AymericLeFeyer/bonap" target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--text-muted)', textDecoration: 'none', padding: '0.5rem 0', fontWeight: 500 }}>GitHub</a>
          </div>
        )}
      </nav>

      <style>{`
        @media (min-width: 768px) { .hidden-mobile { display: flex !important; } .show-mobile { display: none !important; } }
        @media (max-width: 767px) { .hidden-mobile { display: none !important; } .show-mobile { display: flex !important; } }
      `}</style>
    </header>
  )
}
