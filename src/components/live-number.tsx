import { useEffect, useRef, useState } from "react"
import { cn } from "cn"

export function LiveNumber({
  value,
  className,
  tone = "risk",
}: {
  value: number
  className?: string
  tone?: "risk" | "score"
}) {
  const prev = useRef(value)
  const [flash, setFlash] = useState<"up" | "down" | null>(null)

  useEffect(() => {
    if (prev.current === value) return
    setFlash(value > prev.current ? "up" : "down")
    prev.current = value
    const id = window.setTimeout(() => setFlash(null), 900)
    return () => window.clearTimeout(id)
  }, [value])

  const up = tone === "score" ? "text-risk-low" : "text-risk-high"
  const down = tone === "score" ? "text-risk-high" : "text-risk-low"

  return (
    <span
      className={cn(
        "tabular-nums transition-colors duration-300",
        flash === "up" && up,
        flash === "down" && down,
        className,
      )}
    >
      {value}
    </span>
  )
}
