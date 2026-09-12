import { Link } from "react-router-dom"
import { ArrowUpRight, Clock3, Radio, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { daysUntil, formatTime, remainingSlaDays, relativeTime } from "@/lib/format"
import { LiveNumber } from "@/components/live-number"
import { RiskLattice } from "@/components/risk-lattice"
import { ScoreRing, SlaPulse, Surface, TierMark } from "@/components/marks"
import { AreaChart, Donut, Sparkline } from "@/components/charts"
import { useTprm } from "@/state/tprm-store"
import { cn } from "cn"

function delta(series: number[]) {
  if (series.length < 2) return 0
  return Math.round((series[series.length - 1]! - series[series.length - 2]!) * 10) / 10
}

export function CommandCenter() {
  const {
    now,
    lastIngestAt,
    vendors,
    assessments,
    findings,
    signals,
    activities,
    residualTrend,
    alertTrend,
    ackSignal,
  } = useTprm()

  const material = vendors.filter((v) => v.tier === "critical" || v.tier === "high")
  const live = signals.filter((s) => !s.acked)
  const due = assessments
    .filter((a) => a.stage !== "monitoring")
    .sort((a, b) => daysUntil(a.due, now) - daysUntil(b.due, now))
  const hotFindings = findings
    .filter((f) => f.status === "open" || f.status === "in_progress")
    .sort((a, b) => remainingSlaDays(a.opened, a.slaDays, now) - remainingSlaDays(b.opened, b.slaDays, now))
  const avgResidual = Math.round(vendors.reduce((s, v) => s + v.residual, 0) / vendors.length)
  const slaBreach = hotFindings.filter((f) => remainingSlaDays(f.opened, f.slaDays, now) <= 5).length
  const inFlight = assessments.filter((a) => a.stage !== "monitoring").length
  const avgRating = Math.round(vendors.reduce((s, v) => s + v.securityRating, 0) / vendors.length)

  const trendLabels = residualTrend.map((_, i) => {
    const t = new Date(now - (residualTrend.length - 1 - i) * 5_000)
    return formatTime(t.getTime())
  })

  const mix = [
    { label: "Critical", value: vendors.filter((v) => v.tier === "critical").length, color: "var(--risk-critical)" },
    { label: "High", value: vendors.filter((v) => v.tier === "high").length, color: "var(--risk-high)" },
    { label: "Moderate", value: vendors.filter((v) => v.tier === "moderate").length, color: "var(--risk-moderate)" },
    { label: "Low", value: vendors.filter((v) => v.tier === "low").length, color: "var(--risk-low)" },
  ]

  const residualDelta = delta(residualTrend)
  const alertDelta = delta(alertTrend)

  const triage: {
    id: string
    href: string
    kicker: string
    title: string
    meta: string
    action?: () => void
    actionLabel?: string
  }[] = [
    ...live.slice(0, 3).map((s) => ({
      id: s.id,
      href: "/watchtower",
      kicker: "Alert",
      title: `${s.vendorName} · ${s.title}`,
      meta: relativeTime(s.at, now),
      action: () => ackSignal(s.id),
      actionLabel: "Ack",
    })),
    ...due.slice(0, 2).map((a) => ({
      id: a.id,
      href: `/assessments/${a.id}`,
      kicker: "Assessment",
      title: `${a.vendorName} · ${a.template}`,
      meta: `${daysUntil(a.due)}d · ${a.stage}`,
    })),
    ...hotFindings.slice(0, 2).map((f) => ({
      id: f.id,
      href: "/findings",
      kicker: "Finding",
      title: `${f.vendorName} · ${f.title}`,
      meta: `${remainingSlaDays(f.opened, f.slaDays, now)}d SLA`,
    })),
  ].slice(0, 6)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-risk-low/15 px-2 py-0.5 text-risk-low">
              <span className="size-1.5 rounded-full bg-risk-low motion-safe:soft-pulse" />
              Live
            </span>
            {formatTime(now)}
            <span>· ingest {relativeTime(new Date(lastIngestAt).toISOString(), now)}</span>
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Risk operations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {material.length} material vendors · {live.length} open alerts · ratings and residuals move as the feed lands.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/reports">Reports</Link>
          </Button>
          <Button asChild>
            <Link to="/intake">New intake</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Open alerts"
          value={live.length}
          hint={alertDelta >= 0 ? `+${alertDelta} vs last sample` : `${alertDelta} vs last sample`}
          tone={live.length > 4 ? "var(--risk-critical)" : "var(--primary)"}
          series={alertTrend}
          accent="critical"
        />
        <Kpi
          label="Avg residual"
          value={avgResidual}
          hint={residualDelta >= 0 ? `+${residualDelta} pts` : `${residualDelta} pts`}
          tone="var(--primary)"
          series={residualTrend}
          flash="risk"
        />
        <Kpi
          label="SLA at risk"
          value={slaBreach}
          hint={`${hotFindings.length} findings open`}
          tone="var(--risk-high)"
          series={hotFindings.map((f) => 14 - Math.min(13, Math.max(0, remainingSlaDays(f.opened, f.slaDays, now))))}
          accent="high"
        />
        <Kpi
          label="In-flight assessments"
          value={inFlight}
          hint={`Avg rating ${avgRating}`}
          tone="var(--signal)"
          series={assessments.map((a) => a.progress)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Surface className="p-5 lg:col-span-8">
          <div className="mb-2 flex items-end justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Portfolio residual</p>
              <h2 className="text-lg font-semibold tracking-tight">Last 14 samples · 5s</h2>
            </div>
            <div className="flex items-center gap-3">
              <ScoreRing value={avgResidual} label="Now" size={72} />
            </div>
          </div>
          <AreaChart values={residualTrend} labels={trendLabels} />
        </Surface>
        <Surface className="p-5 lg:col-span-4">
          <p className="text-xs font-medium text-muted-foreground">Register mix</p>
          <h2 className="mb-4 text-lg font-semibold tracking-tight">Inherent tier</h2>
          <Donut slices={mix} />
          <p className="mt-4 text-xs text-muted-foreground">
            {vendors.length} third parties on file. Material share{" "}
            {Math.round((material.length / vendors.length) * 100)}%.
          </p>
        </Surface>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Surface className="flex flex-col p-5 lg:col-span-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Triage</p>
              <h2 className="text-lg font-semibold tracking-tight">Do this now</h2>
            </div>
            <Clock3 className="size-4 text-primary" />
          </div>
          <ul className="divide-y divide-border">
            {triage.map((item) => (
              <li key={item.id} className="flex items-center gap-2">
                <Link
                  to={item.href}
                  className="group flex min-w-0 flex-1 items-center gap-3 rounded-md px-1 py-2.5 transition-colors duration-150 hover:bg-muted/70"
                >
                  <span className="w-[84px] shrink-0 text-xs font-medium text-muted-foreground">
                    {item.kicker}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium transition-colors duration-150 group-hover:text-primary">
                      {item.title}
                    </span>
                    <span className="text-xs text-muted-foreground">{item.meta}</span>
                  </span>
                  <ArrowUpRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-all duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                </Link>
                {"action" in item && item.action ? (
                  <Button size="sm" variant="outline" onClick={item.action}>
                    {item.actionLabel}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </Surface>

        <Surface className="p-5 lg:col-span-3">
          <p className="text-xs font-medium text-muted-foreground">Assessments due</p>
          <div className="mt-3 space-y-4">
            {due.slice(0, 3).map((a) => (
              <SlaPulse key={a.id} days={Math.max(0, daysUntil(a.due, now))} label={a.vendorName} />
            ))}
          </div>
          <Button variant="ghost" className="mt-4 w-full" asChild>
            <Link to="/assessments">Open pipeline</Link>
          </Button>
        </Surface>

        <Surface className="p-5 lg:col-span-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Activity</p>
              <h2 className="text-lg font-semibold tracking-tight">Live feed</h2>
            </div>
            <Radio className="size-4 text-signal" />
          </div>
          <ul className="space-y-3">
            {activities.slice(0, 7).map((item) => (
              <li key={item.id} className="flex gap-2">
                <span
                  className={cn(
                    "mt-1.5 size-1.5 shrink-0 rounded-full",
                    item.kind === "signal" && "bg-risk-high",
                    item.kind === "ack" && "bg-risk-low",
                    item.kind === "finding" && "bg-risk-critical",
                    item.kind === "intake" && "bg-primary",
                    item.kind === "assessment" && "bg-signal",
                    item.kind === "rating" && "bg-risk-moderate",
                  )}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {relativeTime(item.at, now)} · {item.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Surface>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Surface className="p-5 lg:col-span-8">
          <RiskLattice vendors={vendors} />
        </Surface>
        <Surface className="p-5 lg:col-span-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Monitoring</p>
              <h2 className="text-lg font-semibold tracking-tight">Open alerts</h2>
            </div>
            <ShieldAlert className="size-4 text-risk-critical" />
          </div>
          <ul className="space-y-3">
            {live.slice(0, 5).map((signal) => {
              const fresh = now - new Date(signal.at).getTime() < 20_000
              return (
                <li key={signal.id} className="flex items-start gap-2">
                  <TierMark tier={signal.severity} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {signal.vendorName}
                      {fresh ? (
                        <span className="rounded bg-risk-critical/15 px-1.5 text-[10px] font-semibold text-risk-critical">
                          NEW
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{signal.title}</p>
                    <p className="text-[11px] text-muted-foreground">{relativeTime(signal.at, now)}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => ackSignal(signal.id)}>
                    Ack
                  </Button>
                </li>
              )
            })}
          </ul>
          <Button variant="outline" className="mt-4 w-full" asChild>
            <Link to="/watchtower">Open monitoring</Link>
          </Button>
        </Surface>
      </div>
    </div>
  )
}

function Kpi({
  label,
  value,
  hint,
  series,
  tone,
  accent,
  flash = "score",
}: {
  label: string
  value: number
  hint: string
  series: number[]
  tone: string
  accent?: "critical" | "high"
  flash?: "risk" | "score"
}) {
  return (
    <Surface className="relative overflow-hidden p-4">
      <span
        className="absolute inset-y-0 left-0 w-0.5"
        style={{ background: tone }}
      />
      <div className="flex items-start justify-between gap-3 pl-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p
            className={cn(
              "mt-1 text-3xl font-semibold tabular-nums tracking-tight",
              accent === "critical" && value > 0 && "text-risk-critical",
              accent === "high" && value > 0 && "text-risk-high",
            )}
          >
            <LiveNumber value={value} tone={accent ? "risk" : flash} />
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <Sparkline values={series} tone={tone} />
      </div>
    </Surface>
  )
}
