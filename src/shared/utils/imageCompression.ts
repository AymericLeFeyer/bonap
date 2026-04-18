/**
 * Compresse une image via le Canvas API avant upload.
 *
 * - Redimensionne si la plus grande dimension dépasse `maxDimension` px
 * - Exporte en JPEG et réduit la qualité jusqu'à passer sous `maxSizeBytes`
 * - Conserve le PNG si l'image a un canal alpha
 */
export async function compressImage(
  file: File,
  options: {
    maxDimension?: number // px, défaut 1920
    maxSizeBytes?: number // octets, défaut 2 Mo
    initialQuality?: number // 0-1, défaut 0.85
  } = {},
): Promise<File> {
  const {
    maxDimension = 1920,
    maxSizeBytes = 2 * 1024 * 1024,
    initialQuality = 0.85,
  } = options

  // Si le fichier est déjà sous la limite, on ne touche à rien
  if (file.size <= maxSizeBytes) return file

  const bitmap = await createImageBitmap(file)

  // Calcul des nouvelles dimensions en conservant le ratio
  let { width, height } = bitmap
  if (width > maxDimension || height > maxDimension) {
    const ratio = Math.min(maxDimension / width, maxDimension / height)
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  // Détecte la transparence pour choisir PNG ou JPEG
  const hasAlpha = file.type === "image/png" || file.type === "image/webp"
  const mimeType = hasAlpha ? "image/png" : "image/jpeg"
  const ext = hasAlpha ? "png" : "jpg"

  // Réduction itérative de la qualité jusqu'à passer sous maxSizeBytes
  let quality = initialQuality
  let blob: Blob | null = null

  for (let attempt = 0; attempt < 6; attempt++) {
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, mimeType, quality),
    )
    if (!blob || blob.size <= maxSizeBytes) break
    quality = Math.max(0.4, quality - 0.1)
  }

  if (!blob) return file // fallback : image originale

  const baseName = file.name.replace(/\.[^.]+$/, "")
  return new File([blob], `${baseName}.${ext}`, { type: mimeType })
}
