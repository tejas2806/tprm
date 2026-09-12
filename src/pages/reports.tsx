import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Surface, TierMark } from "@/components/marks"
import { formatTime, remainingSlaDays } from "@/lib/format"
import { LiveNumber } from "@/components/live-number"
import { useTprm } from "@/state/tprm-store"

export function ReportsPage() {
  const { now, vendors, findings, assessments, signals } = useTprm()
  const material = vendors.filter((v) => v.tier === "critical" || v.tier === "high")
  const open = findings.filter((f) => f.status === "open" || f.status === "in_progress")
  const inFlight = assessments.filter((a) => a.stage !== "monitoring")
  const live = signals.filter((s) => !s.acked && (s.severity === "critical" || s.severity === "high"))

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Northline Bank · FY26 Q3
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Executive report</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live pack · generated {formatTime(now)} · figures refresh with the feed.
          </p>
        </div>
        <Button
          onClick={() => toast.success("Pack exported. Audit trail written.")}
        >
          Export PDF
        </Button>
      </div>

      <Surface className="p-6">
        <h2 className="text-lg font-semibold tracking-tight">Position</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {vendors.length} third parties on the register, {material.length} material. Average residual is{" "}
          {Math.round(vendors.reduce((s, v) => s + v.residual, 0) / vendors.length)}.{" "}
          {open.length} findings remain open. {live.length} high-severity monitoring alerts are unacknowledged.
        </p>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Metric n={material.length} l="Material" />
          <Metric n={inFlight.length} l="Live assessments" />
          <Metric n={open.length} l="Open findings" />
        </div>
      </Surface>

      <Surface className="p-6">
        <h2 className="text-lg font-semibold tracking-tight">Material exceptions</h2>
        <ul className="mt-3 space-y-3">
          {open
            .filter((f) => f.severity === "critical" || f.severity === "high")
            .map((f) => (
              <li key={f.id} className="flex items-start gap-3">
                <TierMark tier={f.severity} />
                <div>
                  <p className="text-sm font-medium">
                    {f.vendorName} · {f.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {remainingSlaDays(f.opened, f.slaDays, now)}d SLA · {f.control}
                  </p>
                </div>
              </li>
            ))}
        </ul>
      </Surface>

      <Surface className="p-6">
        <h2 className="text-lg font-semibold tracking-tight">Concentration</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          AWS is a fourth party to {vendors.filter((v) => v.subprocessors.includes("AWS")).length} vendors,
          including the issuing stack. Recommend a documented alternative path for HelixPay tokenization within
          two quarters.
        </p>
      </Surface>

      <p className="text-center text-xs font-medium text-muted-foreground">
        Prepared by Aegis · not for external distribution
      </p>
    </div>
  )
}

function Metric({ n, l }: { n: number; l: string }) {
  return (
    <div className="rounded-md bg-muted/50 p-3 text-center">
      <p className="text-2xl font-semibold tracking-tight">
        <LiveNumber value={n} tone="risk" />
      </p>
      <p className="text-[11px] text-muted-foreground">{l}</p>
    </div>
  )
}
