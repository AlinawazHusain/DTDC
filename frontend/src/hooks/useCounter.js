import { useState, useEffect } from 'react'

/**
 * Animates a number from 0 to target over `duration` ms.
 * @param {number} target  – the final value
 * @param {number} duration – animation duration in ms (default 2000)
 */
export function useCounter(target, duration = 2000) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    const steps = 60
    let step = 0
    const interval = setInterval(() => {
      step++
      const progress = step / steps
      const ease = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * ease))
      if (step >= steps) clearInterval(interval)
    }, duration / steps)
    return () => clearInterval(interval)
  }, [target, duration])

  return value
}
