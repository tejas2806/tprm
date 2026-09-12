import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { relativeTime } from "@/lib/format"
import { LiveNumber } from "@/components/live-number"
import { Surface, TierMark } from "@/components/marks"
import { useTprm } from "@/state/tprm-store"
import { cn } from "cn"
import type { SignalKind } from "@/types"

const kindLabel: Record<SignalKind, string> = {
  breach: "Breach",
  cve: "CVE",
  cert: "Cert",
  rating: "Rating",
  news: "News",
  expiry: "Expiry",
  ai: "AI",
}

export function WatchtowerPage() {
  const { now, lastIngestAt, signals, ackSignal, ackAllSignals } = useTprm()
  const live = signals.filter((s) => !s.acked)
  const done = signals.filter((s) => s.acked)
  const ordered = [...live, ...done]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Continuous monitoring</p>
          <h1 className="text-2xl font-semibold tracking-tight">Monitoring</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Feed last ingested {relativeTime(new Date(lastIngestAt).toISOString(), now)}. Residual and ratings move with each event.
          </p>
        </div>
        <Button variant="outline" disabled={live.length === 0} onClick={() => {
          ackAllSignals()
          toast.success("All open signals acknowledged.")
        }}>
          Acknowledge all
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Surface className="p-5">
          <p className="text-xs font-medium text-muted-foreground">Open</p>
          <p className="text-3xl font-semibold tracking-tight">
            <LiveNumber value={live.length} tone="risk" />
          </p>
        </Surface>
        <Surface className="p-5">
          <p className="text-xs font-medium text-muted-foreground">Critical / high</p>
          <p className="text-3xl font-semibold tracking-tight">
            <LiveNumber
              value={live.filter((s) => s.severity === "critical" || s.severity === "high").length}
              tone="risk"
            />
          </p>
        </Surface>
        <Surface className="p-5">
          <p className="text-xs font-medium text-muted-foreground">Cleared this week</p>
          <p className="text-3xl font-semibold tabular-nums tracking-tight">{done.length}</p>
        </Surface>
      </div>

      <div className="space-y-3">
        {ordered.map((signal) => {
          const fresh = !signal.acked && now - new Date(signal.at).getTime() < 20_000
          return (
          <Surface key={signal.id} className={cn("flex flex-wrap items-start gap-4 p-4", fresh && "ring-1 ring-risk-critical/25")}>
            <div className="w-20">
              <p className="text-xs font-medium text-primary">
                {kindLabel[signal.kind]}
              </p>
              <TierMark tier={signal.severity} className="mt-2" />
            </div>
            <div className="min-w-0 flex-1">
              <Link to={`/vendors/${signal.vendorId}`} className="text-sm font-medium transition-colors hover:text-primary">
                {signal.vendorName}
                {fresh ? (
                  <span className="ml-2 rounded bg-risk-critical/15 px-1.5 text-[10px] font-semibold text-risk-critical">
                    NEW
                  </span>
                ) : null}
              </Link>
              <p className="text-sm">{signal.title}</p>
              <p className="text-xs text-muted-foreground">{signal.detail}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{relativeTime(signal.at, now)}</p>
            </div>
            <Button
              size="sm"
              variant={signal.acked ? "secondary" : "default"}
              disabled={signal.acked}
              onClick={() => {
                ackSignal(signal.id)
                toast.success("Signal acknowledged. Ticker updated.")
              }}
            >
                {signal.acked ? "Acknowledged" : "Acknowledge"}
            </Button>
          </Surface>
          )
        })}
      </div>
    </div>
  )
}
