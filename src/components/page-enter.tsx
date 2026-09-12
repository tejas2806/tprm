import { useEffect, useState, type ReactNode } from "react"
import { useLocation } from "react-router-dom"

export function PageEnter({ children }: { children: ReactNode }) {
  const location = useLocation()
  return (
    <div key={location.pathname} className="page-enter">
      {children}
    </div>
  )
}

export function useMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(frame)
  }, [])
  return mounted
}
