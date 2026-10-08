import { useEffect } from 'react'

/**
 * Muestra con una transición cada elemento con `data-reveal` cuando entra en
 * pantalla. Sin IntersectionObserver, todo se muestra de inmediato.
 */
export function useReveal() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-reveal="shown"])'))
    if (!('IntersectionObserver' in window)) {
      for (const n of nodes) n.dataset.reveal = 'shown'
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          ;(e.target as HTMLElement).dataset.reveal = 'shown'
          io.unobserve(e.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )
    for (const n of nodes) io.observe(n)
    return () => io.disconnect()
  }, [])
}
