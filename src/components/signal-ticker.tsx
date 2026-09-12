import { memo, useLayoutEffect, useRef } from "react"
import { Link } from "react-router-dom"
import type { Signal } from "@/types"
import { TierMark } from "@/components/marks"

const PX_PER_SEC = 32

function TickerItems({ signals }: { signals: Signal[] }) {
  return (
    <>
      {signals.map((signal) => (
        <Link
          key={signal.id}
          to="/watchtower"
          className="flex items-center gap-2 text-xs whitespace-nowrap text-foreground/80 hover:text-foreground"
        >
          <TierMark tier={signal.severity} />
          <span className="font-medium">{signal.vendorName}</span>
          <span className="text-muted-foreground">{signal.title}</span>
        </Link>
      ))}
    </>
  )
}

export const SignalTicker = memo(function SignalTicker({ signals }: { signals: Signal[] }) {
  const live = signals.filter((s) => !s.acked)
  const fingerprint = live.map((s) => s.id).join("|")
  const groupRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(0)
  const distanceRef = useRef(0)
  const pausedRef = useRef(false)
  const lastTsRef = useRef<number | null>(null)

  useLayoutEffect(() => {
    const group = groupRef.current
    if (!group) return
    const measure = () => {
      distanceRef.current = group.offsetWidth
      if (distanceRef.current > 0) {
        offsetRef.current %= distanceRef.current
      }
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(group)
    return () => observer.disconnect()
  }, [fingerprint])

  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track) return

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
    let raf = 0
    const tick = (ts: number) => {
      const last = lastTsRef.current
      lastTsRef.current = ts
      const distance = distanceRef.current
      if (reduced.matches) {
        track.style.transform = "none"
      } else if (!pausedRef.current && distance > 0 && last != null) {
        const dt = Math.min(32, ts - last)
        offsetRef.current += (PX_PER_SEC * dt) / 1000
        if (offsetRef.current >= distance) offsetRef.current %= distance
        track.style.transform = `translate3d(${-offsetRef.current}px, 0, 0)`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      lastTsRef.current = null
    }
  }, [live.length > 0])

  if (live.length === 0) return null

  return (
    <div
      className="flex h-9 items-center overflow-hidden border-b border-border bg-card"
      onMouseEnter={() => {
        pausedRef.current = true
        lastTsRef.current = null
      }}
      onMouseLeave={() => {
        pausedRef.current = false
      }}
    >
      <span className="z-10 shrink-0 bg-risk-critical px-3 text-[11px] font-semibold tracking-wide text-white">
        Alerts
      </span>
      <div
        className="relative min-w-0 flex-1 overflow-hidden"
        style={{
          maskImage: "linear-gradient(to right, transparent, #000 20px, #000 calc(100% - 20px), transparent)",
        }}
      >
        <div
          ref={trackRef}
          className="flex w-max will-change-transform [backface-visibility:hidden]"
        >
          <div ref={groupRef} className="flex shrink-0 items-center gap-8 pr-8">
            <TickerItems signals={live} />
          </div>
          <div className="flex shrink-0 items-center gap-8 pr-8" aria-hidden>
            <TickerItems signals={live} />
          </div>
        </div>
      </div>
    </div>
  )
})
