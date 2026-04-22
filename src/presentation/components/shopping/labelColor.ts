function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export function labelColor(name: string): string {
  const hue = hashStr(name) % 360
  return `oklch(0.62 0.14 ${hue})`
}
