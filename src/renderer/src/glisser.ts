// Glisser un élément d'une liste à la souris (mousedown, mousemove, mouseup),
// sans le glisser-déposer HTML, que les scénarios ne savent pas jouer.
// Un clic sans mouvement reste un clic.
const SEUIL = 4

export function rendreGlissable(
  el: HTMLElement,
  o: { axe: 'x' | 'y'; liste: () => HTMLElement[]; deposer: (index: number) => void }
): void {
  el.addEventListener('mousedown', (ev) => {
    if (ev.button !== 0) return
    const depart = o.axe === 'y' ? ev.clientY : ev.clientX
    let glisse = false
    const position = (m: MouseEvent): number => (o.axe === 'y' ? m.clientY : m.clientX)

    const bouger = (m: MouseEvent): void => {
      const ecart = position(m) - depart
      if (!glisse && Math.abs(ecart) < SEUIL) return
      glisse = true
      el.classList.add('glisse')
      el.style.transform = o.axe === 'y' ? `translateY(${ecart}px)` : `translateX(${ecart}px)`
    }
    const lacher = (m: MouseEvent): void => {
      window.removeEventListener('mousemove', bouger, true)
      window.removeEventListener('mouseup', lacher, true)
      if (!glisse) return
      el.classList.remove('glisse')
      el.style.transform = ''
      // L'index de dépôt : les autres éléments dont le centre est avant le pointeur.
      const p = position(m)
      const index = o
        .liste()
        .filter((x) => x !== el)
        .filter((x) => {
          const r = x.getBoundingClientRect()
          return (o.axe === 'y' ? r.top + r.height / 2 : r.left + r.width / 2) < p
        }).length
      // Le clic qui suit le lâcher n'en est pas un.
      const avaler = (c: MouseEvent): void => {
        c.stopPropagation()
        c.preventDefault()
      }
      window.addEventListener('click', avaler, true)
      setTimeout(() => window.removeEventListener('click', avaler, true), 0)
      o.deposer(index)
    }
    window.addEventListener('mousemove', bouger, true)
    window.addEventListener('mouseup', lacher, true)
  })
}
