import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Surface, TierMark, StatusChip } from "@/components/marks"
import { formatDate, formatSlaClock, remainingSlaDays } from "@/lib/format"
import { useTprm } from "@/state/tprm-store"
import type { FindingStatus } from "@/types"
import { cn } from "cn"

const statuses: FindingStatus[] = ["open", "in_progress", "accepted", "closed"]

export function FindingsPage() {
  const { now, findings, setFindingStatus } = useTprm()
  const open = findings.filter((f) => f.status === "open" || f.status === "in_progress")

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Remediation</p>
        <h1 className="text-2xl font-semibold tracking-tight">Findings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {open.length} still on the clock. Residual does not move until these close or exceptions are signed.
        </p>
      </div>

      <div className="space-y-3">
        {findings.map((finding) => {
          const left = remainingSlaDays(finding.opened, finding.slaDays, now)
          const clock = formatSlaClock(finding.opened, finding.slaDays, now)
          return (
          <Surface key={finding.id} className="p-4">
            <div className="flex flex-wrap items-start gap-4">
              <div
                className={cn(
                  "grid min-w-12 shrink-0 place-items-center rounded-md px-2 py-1.5 ring-1",
                  left <= 5
                    ? "bg-risk-critical/10 text-risk-critical ring-risk-critical/25 motion-safe:soft-pulse"
                    : "bg-muted text-foreground ring-border",
                )}
              >
                <span className="text-lg font-semibold tabular-nums leading-none">{left}</span>
                <span className="text-[10px] text-muted-foreground">days</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <TierMark tier={finding.severity} />
                  <StatusChip status={finding.status} />
                  <span className="font-mono text-[10px] text-muted-foreground">{finding.control}</span>
                </div>
                <h2 className="mt-1 text-base font-medium">{finding.title}</h2>
                <p className="text-sm text-muted-foreground">{finding.detail}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  <Link to={`/vendors/${finding.vendorId}`} className="hover:text-primary">
                    {finding.vendorName}
                  </Link>
                  {" · "}
                  {finding.owner} · opened {formatDate(finding.opened)} · {clock}
                </p>
              </div>
              <Select
                value={finding.status}
                onValueChange={(value) => {
                  setFindingStatus(finding.id, value as FindingStatus)
                  toast.success("Finding status updated. Residual recalculated.")
                }}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replaceAll("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Surface>
          )
        })}
      </div>
      <Button variant="outline" onClick={() => toast.message("Exception pack drafted for CRO.")}>
        Package exceptions for CRO
      </Button>
    </div>
  )
}
