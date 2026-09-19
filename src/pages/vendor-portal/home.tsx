import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ScoreRing, StatusChip, Surface, TierMark } from "@/components/marks"
import { daysUntil, formatDate, formatSlaClock, relativeTime } from "@/lib/format"
import { useAuth } from "@/state/auth"
import { useTprm } from "@/state/tprm-store"

export function VendorHome() {
  const { user } = useAuth()
  const { now, vendors, assessments, findings, signals } = useTprm()
  const vendor = vendors.find((item) => item.id === user?.vendorId)
  if (!vendor) {
    return <p className="text-sm text-muted-foreground">No vendor file is linked to this login.</p>
  }
  const mine = assessments.filter((item) => item.vendorId === vendor.id)
  const openFindings = findings.filter(
    (item) => item.vendorId === vendor.id && (item.status === "open" || item.status === "in_progress"),
  )
  const asks = signals.filter((item) => item.vendorId === vendor.id && !item.acked).slice(0, 4)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Northline Bank · vendor portal</p>
          <h1 className="text-2xl font-semibold tracking-tight">{vendor.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {user?.name} · {vendor.category}. Residual and requests update as Northline’s desk works.
          </p>
        </div>
        <div className="flex gap-2">
          <TierMark tier={vendor.tier} />
          <StatusChip status={vendor.status} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Surface className="p-5 lg:col-span-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">How Northline sees you</p>
              <h2 className="text-lg font-semibold tracking-tight">Residual</h2>
            </div>
            <ScoreRing value={vendor.residual} label="Now" size={72} />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            External rating {vendor.securityRating}. Next review {formatDate(vendor.nextReview)}.
          </p>
        </Surface>
        <Surface className="p-5 lg:col-span-4">
          <p className="text-xs font-medium text-muted-foreground">Due from you</p>
          <h2 className="text-lg font-semibold tracking-tight">{mine.length} assessment{mine.length === 1 ? "" : "s"}</h2>
          <ul className="mt-3 space-y-2">
            {mine.map((item) => (
              <li key={item.id} className="text-sm">
                {item.template} · {item.progress}% · {daysUntil(item.due, now)}d
              </li>
            ))}
            {mine.length === 0 ? (
              <li className="text-sm text-muted-foreground">No questionnaire assigned yet.</li>
            ) : null}
          </ul>
          <Button className="mt-4" asChild>
            <Link to="/vendor/questionnaire">Open questionnaire</Link>
          </Button>
        </Surface>
        <Surface className="p-5 lg:col-span-4">
          <p className="text-xs font-medium text-muted-foreground">Remediation</p>
          <h2 className="text-lg font-semibold tracking-tight">{openFindings.length} open findings</h2>
          <ul className="mt-3 space-y-2">
            {openFindings.slice(0, 3).map((item) => (
              <li key={item.id} className="text-sm">
                {item.title}
                <span className="block text-xs text-muted-foreground">
                  {formatSlaClock(item.opened, item.slaDays, now)}
                </span>
              </li>
            ))}
          </ul>
          <Button className="mt-4" variant="outline" asChild>
            <Link to="/vendor/findings">Respond</Link>
          </Button>
        </Surface>
      </div>

      <Surface className="p-5">
        <p className="text-xs font-medium text-muted-foreground">From Northline monitoring</p>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Open requests</h2>
        {asks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No unacknowledged signals on your file.</p>
        ) : (
          <ul className="space-y-3">
            {asks.map((item) => (
              <li key={item.id}>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {item.detail} · {relativeTime(item.at, now)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Surface>
    </div>
  )
}
