import { useState, useRef, useEffect } from "react"
import { Sparkles, X, Send, Trash2, Loader2, Bot, User, Wrench } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { Button } from "./ui/button.tsx"
import { Input } from "./ui/input.tsx"
import { useAssistant } from "../hooks/useAssistant.ts"
import { cn } from "../../lib/utils.ts"

export function AssistantDrawer() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { messages, loading, sendMessage, clearHistory, ensureContext } = useAssistant()

  // Load context when drawer opens
  useEffect(() => {
    if (open) {
      void ensureContext()
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, ensureContext])

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
          "fixed bottom-5 right-5 z-50 flex h-13 w-13 items-center justify-center rounded-full shadow-lg transition-all duration-200",
          "bg-primary text-primary-foreground hover:bg-primary/90",
          open && "rotate-90",
          "h-12 w-12",
        )}
        aria-label="Assistant IA"
      >
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      </button>

      {/* Drawer panel */}
      <div
        className={cn(
          "fixed bottom-20 right-4 z-50 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col rounded-xl border bg-background shadow-2xl transition-all duration-300 ease-out",
          open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none",
        )}
        style={{ height: "520px" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Assistant Bonap</span>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                aria-label="Effacer la conversation"
                title="Effacer la conversation"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Fermer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
              <Bot className="h-10 w-10 opacity-20" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Bonjour ! Je suis ton assistant culinaire.</p>
                <p className="text-xs">Pose-moi une question sur tes recettes, ton planning ou demande-moi des idées de repas.</p>
              </div>
              <div className="flex flex-wrap justify-center gap-1.5 pt-2">
                {["Quoi manger ce soir ?", "Recette rapide", "Ajoute au planning"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setInput(s); inputRef.current?.focus() }}
                    className="rounded-full border px-3 py-1 text-xs hover:bg-accent transition-colors"
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
                msg.role === "user" ? "bg-primary text-primary-foreground" : msg.role === "tool" ? "bg-muted text-muted-foreground" : "bg-muted text-foreground",
              )}>
                {msg.role === "user" ? <User className="h-3 w-3" /> : msg.role === "tool" ? <Wrench className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
              </div>

              {/* Bubble */}
              <div className={cn(
                "max-w-[80%] rounded-lg px-3 py-2 text-sm leading-relaxed",
                msg.role === "user" ? "bg-primary text-primary-foreground" : msg.role === "tool" ? "bg-muted/50 text-muted-foreground italic text-xs" : "bg-muted",
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
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                <Bot className="h-3 w-3" />
              </div>
              <div className="rounded-lg bg-muted px-3 py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t px-3 py-3">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="Pose une question…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              className="flex-1 text-sm"
            />
            <Button
              size="icon"
              onClick={() => void handleSend()}
              disabled={!input.trim() || loading}
              className="shrink-0"
              aria-label="Envoyer"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
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
