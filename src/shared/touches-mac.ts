// Les touches de macOS que xterm ne traduit pas comme un terminal du Mac :
// ⇧↵ va à la ligne dans Claude Code (comme ⌥↵), ⌘← et ⌘→ vont en début et en
// fin de ligne, ⌘⌫ efface jusqu'au début de la ligne.
export type ToucheMac = {
  key: string
  shiftKey: boolean
  metaKey: boolean
  altKey: boolean
  ctrlKey: boolean
}

export function sequenceMac(e: ToucheMac): string | null {
  if (e.ctrlKey || e.altKey) return null
  if (e.shiftKey && !e.metaKey && e.key === 'Enter') return '\x1b\r'
  if (e.metaKey && !e.shiftKey) {
    if (e.key === 'ArrowLeft') return '\x01'
    if (e.key === 'ArrowRight') return '\x05'
    if (e.key === 'Backspace') return '\x15'
  }
  return null
}
