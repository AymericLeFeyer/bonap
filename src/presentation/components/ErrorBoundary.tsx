import { Component, type ErrorInfo, type ReactNode } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "./ui/button.tsx"

interface Props {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("[ErrorBoundary] caught", error, info)
    }
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset)
      }
      return (
        <div className="flex min-h-[60vh] items-center justify-center p-8">
          <div className="max-w-md w-full rounded-[var(--radius-2xl)] border border-destructive/20 bg-destructive/5 p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="mb-2 font-heading text-lg font-bold">
              Une erreur s'est produite
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {this.state.error.message || "Erreur inattendue"}
            </p>
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={this.reset}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Réessayer
              </Button>
              <Button
                size="sm"
                onClick={() => window.location.reload()}
              >
                Recharger la page
              </Button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
