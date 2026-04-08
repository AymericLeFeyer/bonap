const ALLOWED_IMG_ATTRS = new Set(["src", "alt", "width", "height"])

/**
 * Sanitize instruction HTML: strips all elements except <img>, and on <img>
 * keeps only safe attributes (src, alt, width, height) to prevent XSS via
 * onerror / onload / srcdoc etc.
 */
export function sanitizeInstructionHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html")

  doc.body.querySelectorAll("*").forEach((el) => {
    if (el.tagName.toLowerCase() === "img") {
      // Strip all attributes except the allowed list
      Array.from(el.attributes).forEach((attr) => {
        if (!ALLOWED_IMG_ATTRS.has(attr.name.toLowerCase())) {
          el.removeAttribute(attr.name)
        }
      })
    } else {
      el.replaceWith(...Array.from(el.childNodes))
    }
  })

  return doc.body.innerHTML
}