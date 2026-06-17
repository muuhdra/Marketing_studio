import { useEffect, useRef, useState } from 'react'

// Chrono écoulé formaté mm:ss, remis à zéro et arrêté quand `active` passe à false.
export function useElapsed(active: boolean): string {
  const [sec, setSec] = useState(0)
  const startRef = useRef<number | null>(null)
  useEffect(() => {
    if (!active) { startRef.current = null; setSec(0); return }
    startRef.current = Date.now()
    const id = setInterval(() => {
      if (startRef.current) setSec(Math.floor((Date.now() - startRef.current) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [active])
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`
}
