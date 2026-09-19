import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Surface, StatusChip, TierMark } from "@/components/marks"
import { formatDate, formatSlaClock } from "@/lib/format"
import { useAuth } from "@/state/auth"
import { useTprm } from "@/state/tprm-store"
import type { FindingStatus, RiskTier } from "@/types"

export function VendorFindings() {
  const { user } = useAuth()
  const { now, findings, respondToFinding } = useTprm()
  const mine = findings.filter((item) => item.vendorId === user?.vendorId)

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Remediation</p>
        <h1 className="text-2xl font-semibold tracking-tight">Findings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Respond with a plan. Northline residual does not move until their analyst closes the item.
        </p>
      </div>
      <div className="space-y-3">
        {mine.map((finding) => (
          <FindingCard
            key={finding.id}
            title={finding.title}
            detail={finding.detail}
            severity={finding.severity}
            status={finding.status as FindingStatus}
            control={finding.control}
            clock={formatSlaClock(finding.opened, finding.slaDays, now)}
            opened={formatDate(finding.opened)}
            note={finding.vendorNote}
            onSubmit={(note) => {
              respondToFinding(finding.id, note)
              toast.success("Response posted. InfoSec will see it on the finding.")
            }}
          />
        ))}
        {mine.length === 0 ? (
          <Surface className="p-8 text-sm text-muted-foreground">No findings on your file.</Surface>
        ) : null}
      </div>
    </div>
  )
}

function FindingCard({
  title,
  detail,
  severity,
  status,
  control,
  clock,
  opened,
  note,
  onSubmit,
}: {
  title: string
  detail: string
  severity: RiskTier
  status: FindingStatus
  control: string
  clock: string
  opened: string
  note?: string
  onSubmit: (note: string) => void
}) {
  const [draft, setDraft] = useState(note ?? "")
  return (
    <Surface className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <TierMark tier={severity} />
        <StatusChip status={status} />
        <span className="font-mono text-[10px] text-muted-foreground">{control}</span>
      </div>
      <h2 className="mt-2 text-base font-medium">{title}</h2>
      <p className="text-sm text-muted-foreground">{detail}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Opened {opened} · {clock}
      </p>
      <Textarea
        className="mt-3"
        rows={3}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Remediation plan, owner, and target date"
      />
      <Button
        className="mt-2"
        size="sm"
        disabled={!draft.trim()}
        onClick={() => onSubmit(draft.trim())}
      >
        Send response
      </Button>
    </Surface>
  )
}
