import type { ComponentProps } from "react"
import { cn } from "cn"
import type { FindingStatus, RiskTier, VendorStatus } from "@/types"
import { statusLabel, tierLabel } from "@/lib/format"
import { LiveNumber } from "@/components/live-number"
import { useMounted } from "@/components/page-enter"

const tierTone: Record<RiskTier, string> = {
  critical: "bg-risk-critical/10 text-risk-critical ring-risk-critical/20",
  high: "bg-risk-high/10 text-risk-high ring-risk-high/20",
  moderate: "bg-risk-moderate/15 text-risk-moderate ring-risk-moderate/25",
  low: "bg-risk-low/10 text-risk-low ring-risk-low/20",
}

export function TierMark({ tier, className }: { tier: RiskTier; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-md px-2 text-xs font-medium capitalize ring-1",
        tierTone[tier],
        className,
      )}
    >
      {tierLabel(tier)}
    </span>
  )
}

export function StatusChip({
  status,
  className,
}: {
  status: VendorStatus | FindingStatus
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-md bg-muted px-2 text-xs font-medium capitalize text-muted-foreground",
        className,
      )}
    >
      {statusLabel(status)}
    </span>
  )
}

export function ScoreRing({
  value,
  label,
  size = 88,
}: {
  value: number
  label: string
  size?: number
}) {
  const mounted = useMounted()
  const stroke = 6
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const tone =
    value >= 75
      ? "var(--risk-critical)"
      : value >= 55
        ? "var(--risk-high)"
        : value >= 35
          ? "var(--risk-moderate)"
          : "var(--risk-low)"
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="currentColor"
            className="text-border"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={tone}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={mounted ? c * (1 - value / 100) : c}
            className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-700 motion-safe:ease-out"
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="text-2xl font-semibold tracking-tight">
            <LiveNumber value={value} tone="risk" />
          </span>
        </div>
      </div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  )
}

export function RiskDna({
  dna,
}: {
  dna: { data: number; access: number; criticality: number; geo: number; fourth: number }
}) {
  const mounted = useMounted()
  const rows = [
    ["Data", dna.data, 32],
    ["Access", dna.access, 26],
    ["Criticality", dna.criticality, 22],
    ["Geo", dna.geo, 12],
    ["Fourth party", dna.fourth, 16],
  ] as const
  return (
    <div className="space-y-2.5">
      {rows.map(([label, value, max], index) => (
        <div key={label} className="grid grid-cols-[104px_1fr_28px] items-center gap-2">
          <span className="text-xs text-muted-foreground">{label}</span>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-out"
              style={{
                width: mounted ? `${Math.min(100, (value / max) * 100)}%` : "0%",
                transitionDelay: mounted ? `${index * 70}ms` : "0ms",
              }}
            />
          </div>
          <span className="text-right font-mono text-xs tabular-nums text-foreground/80">{value}</span>
        </div>
      ))}
    </div>
  )
}

export function SlaPulse({ days, label }: { days: number; label: string }) {
  const urgent = days <= 5
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "grid size-10 place-items-center rounded-lg ring-1",
          urgent
            ? "bg-risk-critical/10 text-risk-critical ring-risk-critical/25 motion-safe:soft-pulse"
            : "bg-primary/8 text-primary ring-primary/20",
        )}
      >
        <span className="text-base font-semibold tabular-nums">{days}</span>
      </span>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">days remaining</p>
      </div>
    </div>
  )
}

export function Surface({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card shadow-xs transition-shadow duration-200 hover:shadow-sm",
        className,
      )}
      {...props}
    />
  )
}
