import ReactMarkdown from "react-markdown"
import { cn } from "../../lib/utils.ts"

interface MarkdownContentProps {
  children: string
  className?: string
}

/**
 * Rendu Markdown avec styles cohérents avec le design system Bonap.
 * Utilisé pour la description et les instructions des recettes.
 */
export function MarkdownContent({ children, className }: MarkdownContentProps) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => (
          <p className="leading-relaxed [&:not(:last-child)]:mb-2">{children}</p>
        ),
        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="my-2 ml-4 list-decimal space-y-1">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        h1: ({ children }) => <h1 className="font-heading text-xl font-bold mb-2 mt-3">{children}</h1>,
        h2: ({ children }) => <h2 className="font-heading text-lg font-bold mb-1.5 mt-3">{children}</h2>,
        h3: ({ children }) => <h3 className="font-heading text-base font-semibold mb-1 mt-2">{children}</h3>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">
            {children}
          </a>
        ),
        code: ({ children }) => (
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{children}</code>
        ),
        pre: ({ children }) => (
          <pre className="my-2 overflow-x-auto rounded-[var(--radius-lg)] bg-muted p-3 text-sm">{children}</pre>
        ),
        hr: () => <hr className="my-3 border-border/40" />,
        blockquote: ({ children }) => (
          <blockquote className="my-2 border-l-2 border-primary/40 pl-3 text-muted-foreground italic">
            {children}
          </blockquote>
        ),
      }}
      className={cn("text-sm text-muted-foreground", className)}
    >
      {children}
    </ReactMarkdown>
  )
}
