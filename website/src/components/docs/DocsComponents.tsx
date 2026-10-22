import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { track } from '../../lib/aynalytics'

interface CodeBlockProps {
  code: string
  language?: string
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    track('code_copy', {
      page: window.location.pathname,
      language: language ?? 'bash',
      // Première ligne seulement : identifie la commande sans envoyer tout le bloc.
      command: code.split('\n')[0].slice(0, 200),
    })
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      position: 'relative',
      borderRadius: '10px',
      border: '1px solid var(--border)',
      overflow: 'hidden',
      margin: '1rem 0',
    }}>
      {/* Header bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.5rem 1rem',
        background: 'var(--code-bg-header)',
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {language ?? 'bash'}
        </span>
        <button
          onClick={handleCopy}
          title="Copier"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: copied ? 'var(--primary)' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            fontSize: '0.75rem',
            fontWeight: 500,
            padding: '0.25rem 0.5rem',
            borderRadius: '4px',
            transition: 'color 0.2s, background 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!copied) e.currentTarget.style.color = 'var(--text)'
            e.currentTarget.style.background = 'var(--code-btn-hover)'
          }}
          onMouseLeave={(e) => {
            if (!copied) e.currentTarget.style.color = 'var(--text-muted)'
            e.currentTarget.style.background = 'none'
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copié' : 'Copier'}
        </button>
      </div>

      {/* Code */}
      <pre style={{
        margin: 0,
        padding: '1rem 1.25rem',
        background: 'var(--code-bg-body)',
        overflowX: 'auto',
        fontSize: '0.82rem',
        lineHeight: 1.7,
        color: 'var(--primary-light)',
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        <code>{code}</code>
      </pre>
    </div>
  )
}

interface StepProps {
  number: number
  title: string
  children: React.ReactNode
}

export function Step({ number, title, children }: StepProps) {
  return (
    <div style={{
      display: 'flex',
      gap: '1rem',
      marginBottom: '1.75rem',
    }}>
      <div style={{ flexShrink: 0 }}>
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: 'white',
          marginTop: '2px',
        }}>
          {number}
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <h3 style={{
          fontWeight: 700,
          fontSize: '1rem',
          color: 'var(--text)',
          marginBottom: '0.5rem',
          marginTop: '4px',
        }}>
          {title}
        </h3>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

interface AlertProps {
  type?: 'info' | 'warning' | 'tip'
  children: React.ReactNode
}

const alertStyles = {
  info: { bg: 'var(--alert-info-bg)', border: 'var(--alert-info-border)', color: 'var(--alert-info-color)', label: 'Info' },
  warning: { bg: 'var(--alert-warn-bg)', border: 'var(--alert-warn-border)', color: 'var(--alert-warn-color)', label: 'Note' },
  tip: { bg: 'var(--primary-subtle)', border: 'var(--primary-glow)', color: 'var(--primary-light)', label: 'Astuce' },
}

export function Alert({ type = 'info', children }: AlertProps) {
  const s = alertStyles[type]
  return (
    <div style={{
      padding: '0.875rem 1rem',
      borderRadius: '8px',
      background: s.bg,
      border: `1px solid ${s.border}`,
      margin: '1rem 0',
      fontSize: '0.875rem',
      lineHeight: 1.6,
    }}>
      <span style={{ fontWeight: 700, color: s.color }}>{s.label} : </span>
      <span style={{ color: 'var(--text-muted)' }}>{children}</span>
    </div>
  )
}

export function DocH1({ children }: { children: React.ReactNode }) {
  return (
    <h1 style={{
      fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
      fontWeight: 800,
      letterSpacing: '-0.02em',
      color: 'var(--text)',
      marginBottom: '0.5rem',
      lineHeight: 1.2,
    }}>
      {children}
    </h1>
  )
}

export function DocH2({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: '1.25rem',
      fontWeight: 700,
      color: 'var(--text)',
      marginTop: '2.5rem',
      marginBottom: '0.75rem',
      paddingBottom: '0.5rem',
      borderBottom: '1px solid var(--border)',
    }}>
      {children}
    </h2>
  )
}

export function DocLead({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      color: 'var(--text-muted)',
      fontSize: '1rem',
      lineHeight: 1.7,
      marginBottom: '2rem',
      marginTop: '0.5rem',
    }}>
      {children}
    </p>
  )
}

interface TableRow {
  cells: string[]
}

interface TableProps {
  headers: string[]
  rows: TableRow[]
}

export function DocsTable({ headers, rows }: TableProps) {
  return (
    <div style={{ overflowX: 'auto', margin: '1rem 0' }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '0.875rem',
      }}>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} style={{
                padding: '0.625rem 0.875rem',
                textAlign: 'left',
                fontWeight: 700,
                color: 'var(--text)',
                background: 'var(--bg-card)',
                borderBottom: '1px solid var(--border)',
                whiteSpace: 'nowrap',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
              {row.cells.map((cell, j) => (
                <td key={j} style={{
                  padding: '0.625rem 0.875rem',
                  color: 'var(--text-muted)',
                  verticalAlign: 'top',
                }}>
                  {j === 0 ? (
                    <code style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '0.8rem',
                      color: 'var(--primary-light)',
                      background: 'var(--primary-subtle)',
                      padding: '0.1rem 0.375rem',
                      borderRadius: '4px',
                    }}>
                      {cell}
                    </code>
                  ) : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '0.82em',
      color: 'var(--primary-light)',
      background: 'var(--primary-subtle)',
      padding: '0.1rem 0.35rem',
      borderRadius: '4px',
    }}>
      {children}
    </code>
  )
}
