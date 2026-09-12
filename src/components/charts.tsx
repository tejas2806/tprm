import { cn } from "cn"

export function Sparkline({
  values,
  className,
  tone = "var(--primary)",
}: {
  values: number[]
  className?: string
  tone?: string
}) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const w = 88
  const h = 28
  const points = values.map((value, i) => {
    const x = (i / (values.length - 1)) * w
    const y = h - ((value - min) / span) * (h - 4) - 2
    return `${x},${y}`
  })
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("h-7 w-[88px]", className)} aria-hidden>
      <polyline
        fill="none"
        stroke={tone}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points.join(" ")}
      />
    </svg>
  )
}

export function AreaChart({
  values,
  labels,
}: {
  values: number[]
  labels: string[]
}) {
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 1)
  const span = max - min || 1
  const w = 640
  const h = 220
  const pad = { l: 28, r: 8, t: 12, b: 28 }
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b
  const coords = values.map((value, i) => {
    const x = pad.l + (i / Math.max(values.length - 1, 1)) * innerW
    const y = pad.t + innerH - ((value - min) / span) * innerH
    return [x, y] as const
  })
  const line = coords.map(([x, y]) => `${x},${y}`).join(" ")
  const area = `${pad.l},${pad.t + innerH} ${line} ${pad.l + innerW},${pad.t + innerH}`
  const last = coords[coords.length - 1]
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label="Portfolio residual trend">
      {[0, 0.5, 1].map((t) => {
        const y = pad.t + innerH * (1 - t)
        return (
          <g key={t}>
            <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} className="stroke-border" />
            <text x={4} y={y + 4} className="fill-muted-foreground text-[10px]">
              {Math.round(min + span * t)}
            </text>
          </g>
        )
      })}
      <polygon points={area} fill="var(--primary)" opacity="0.12" />
      <polyline
        points={line}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {last ? (
        <circle cx={last[0]} cy={last[1]} r="3.5" fill="var(--primary)" className="motion-safe:soft-pulse" />
      ) : null}
      {labels.map((label, i) => {
        if (i !== 0 && i !== labels.length - 1 && i % 3 !== 0) return null
        const x = pad.l + (i / Math.max(values.length - 1, 1)) * innerW
        return (
          <text key={label + i} x={x} y={h - 8} textAnchor="middle" className="fill-muted-foreground text-[10px]">
            {label}
          </text>
        )
      })}
    </svg>
  )
}

export function Donut({
  slices,
}: {
  slices: { label: string; value: number; color: string }[]
}) {
  const total = slices.reduce((sum, s) => sum + s.value, 0) || 1
  const r = 36
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 96 96" className="size-24 -rotate-90">
        {slices.map((slice) => {
          const len = (slice.value / total) * c
          const dash = `${len} ${c - len}`
          const el = (
            <circle
              key={slice.label}
              cx="48"
              cy="48"
              r={r}
              fill="none"
              stroke={slice.color}
              strokeWidth="12"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
            />
          )
          offset += len
          return el
        })}
      </svg>
      <ul className="space-y-1.5 text-xs">
        {slices.map((slice) => (
          <li key={slice.label} className="flex items-center gap-2">
            <span className="size-2 rounded-full" style={{ background: slice.color }} />
            <span className="text-muted-foreground">{slice.label}</span>
            <span className="ml-auto font-medium tabular-nums">{slice.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
