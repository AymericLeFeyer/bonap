import { useState, useRef, useEffect } from "react"
import { Sparkles, X, Send, Trash2, Loader2, Bot, User, Wrench, AlertCircle, Settings } from "lucide-react"
import { Link } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import { Button } from "./ui/button.tsx"
import { Input } from "./ui/input.tsx"
import { useAssistant } from "../hooks/useAssistant.ts"
import { cn } from "../../lib/utils.ts"
import { llmConfigService } from "../../infrastructure/llm/LLMConfigService.ts"


export function AssistantDrawer() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const configured = llmConfigService.isConfigured()
  const { messages, loading, sendMessage, clearHistory, ensureContext } = useAssistant()

  // Load context when drawer opens
  useEffect(() => {
    if (open && configured) {
      void ensureContext()
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, configured, ensureContext])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput("")
    await sendMessage(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-[72px] md:bottom-5 right-4 md:right-5 z-50",
          "flex h-11 w-11 items-center justify-center rounded-full",
          "bg-primary text-primary-foreground",
          "shadow-[0_4px_16px_oklch(0.58_0.175_38/0.40),0_2px_6px_oklch(0_0_0/0.12)]",
          "hover:bg-primary/92 hover:shadow-[0_6px_24px_oklch(0.58_0.175_38/0.50)]",
          "active:scale-95",
          "transition-all duration-200",
          open && "rotate-[135deg]",
        )}
        aria-label="Assistant IA"
      >
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-[18px] w-[18px]" />}
      </button>

      {/* Drawer panel */}
      <div
        className={cn(
          "fixed bottom-20 right-4 z-50 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col",
          "rounded-[var(--radius-2xl)] border border-border/50 bg-card",
          "shadow-warm-lg",
          "transition-all duration-300 ease-[cubic-bezier(0.22,0.68,0,1.2)]",
          open
            ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
            : "opacity-0 translate-y-4 scale-[0.97] pointer-events-none",
        )}
        style={{ height: "520px" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 px-4 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="font-heading font-bold text-sm tracking-tight">Assistant Bonap</span>
          </div>
          <div className="flex items-center gap-0.5">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)]",
                  "text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors",
                )}
                aria-label="Effacer la conversation"
                title="Effacer la conversation"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)]",
                "text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors",
              )}
              aria-label="Fermer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Not configured warning */}
        {!configured && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
              <AlertCircle className="h-6 w-6 text-amber-500" />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-foreground">Assistant non configuré</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Configurez un fournisseur IA et une clé API pour utiliser l'assistant.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <Link
                to="/settings"
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-[var(--radius-lg)] px-4 py-2",
                  "bg-primary text-primary-foreground text-sm font-medium",
                  "hover:bg-primary/90 transition-colors",
                )}
              >
                <Settings className="h-3.5 w-3.5" />
                Ouvrir les paramètres
              </Link>
              <a
                href="https://bonap.aylabs.fr/docs/configuration/llm"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
              >
                Aide à la configuration →
              </a>
            </div>
          </div>
        )}

        {/* Messages */}
        {configured && <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
              <Bot className="h-10 w-10 opacity-15" />
              <div className="space-y-1">
                <p className="text-sm font-semibold">Bonjour ! Je suis ton assistant culinaire.</p>
                <p className="text-xs leading-relaxed">Pose-moi une question sur tes recettes, ton planning ou demande-moi des idées de repas.</p>
              </div>
              <div className="flex flex-wrap justify-center gap-1.5 pt-2">
                {["Quoi manger ce soir ?", "Recette rapide", "Ajoute au planning"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setInput(s); inputRef.current?.focus() }}
                    className="rounded-full border border-border/60 px-3 py-1 text-xs hover:bg-secondary hover:border-border transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex gap-2", msg.role === "user" && "flex-row-reverse")}>
              {/* Avatar */}
              <div className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : msg.role === "tool"
                    ? "bg-muted text-muted-foreground"
                    : "bg-secondary text-foreground",
              )}>
                {msg.role === "user" ? <User className="h-3 w-3" /> : msg.role === "tool" ? <Wrench className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
              </div>

              {/* Bubble */}
              <div className={cn(
                "max-w-[80%] rounded-[var(--radius-lg)] px-3 py-2 text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-[var(--radius-xs)]"
                  : msg.role === "tool"
                    ? "bg-muted/50 text-muted-foreground italic text-xs"
                    : "bg-secondary text-foreground rounded-tl-[var(--radius-xs)]",
              )}>
                {msg.role === "assistant" && msg.content ? (
                  <>
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="mb-1 ml-3 list-disc space-y-0.5">{children}</ul>,
                        ol: ({ children }) => <ol className="mb-1 ml-3 list-decimal space-y-0.5">{children}</ol>,
                        li: ({ children }) => <li>{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        code: ({ children }) => <code className="rounded bg-black/10 px-1 font-mono text-xs">{children}</code>,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                    {msg.isStreaming && <span className="ml-0.5 inline-block w-1.5 h-3.5 animate-pulse bg-current rounded opacity-60 align-middle" />}
                  </>
                ) : (
                  <>
                    {msg.content || (msg.isStreaming ? <span className="inline-block w-4 h-3 animate-pulse bg-current rounded opacity-60" /> : null)}
                    {msg.isStreaming && msg.content && <span className="ml-0.5 inline-block w-1.5 h-3.5 animate-pulse bg-current rounded opacity-60 align-middle" />}
                  </>
                )}
              </div>
            </div>
          ))}

          {loading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary">
                <Bot className="h-3 w-3 text-muted-foreground" />
              </div>
              <div className="rounded-[var(--radius-lg)] bg-secondary px-3 py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>}

        {/* Input */}
        {configured && <div className="border-t border-border/40 px-3 py-3 shrink-0">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="Pose une question…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              className="flex-1 text-sm h-8"
            />
            <Button
              size="icon-sm"
              onClick={() => void handleSend()}
              disabled={!input.trim() || loading}
              className="shrink-0"
              aria-label="Envoyer"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>}
      </div>

      {/* Click-outside overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  )
}
