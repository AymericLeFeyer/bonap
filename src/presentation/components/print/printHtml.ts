/**
 * Imprime un document HTML autonome via une iframe cachée, sans ouvrir
 * d'onglet. Attend le chargement des images (avec un plafond) pour qu'elles
 * figurent sur la page imprimée.
 */
export function printHtml(html: string, imageTimeoutMs = 3000): void {
  const iframe = document.createElement("iframe")
  iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:0"
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument
  const win = iframe.contentWindow
  if (!doc || !win) {
    iframe.remove()
    return
  }
  doc.open()
  doc.write(html)
  doc.close()

  const pending = Array.from(doc.images).filter((img) => !img.complete)
  const imagesLoaded = Promise.all(
    pending.map(
      (img) =>
        new Promise<void>((resolve) => {
          img.addEventListener("load", () => resolve(), { once: true })
          img.addEventListener("error", () => resolve(), { once: true })
        }),
    ),
  )
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, imageTimeoutMs))

  void Promise.race([imagesLoaded, timeout]).then(() => {
    win.onafterprint = () => iframe.remove()
    win.focus()
    win.print()
  })
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
