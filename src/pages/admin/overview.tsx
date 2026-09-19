import { Link } from "react-router-dom"
import { roleLabel } from "@/data/accounts"
import { relativeTime } from "@/lib/format"
import { LiveNumber } from "@/components/live-number"
import { Surface } from "@/components/marks"
import { useTprm } from "@/state/tprm-store"
import { Button } from "@/components/ui/button"
import { cn } from "cn"

export function AdminOverview() {
  const { now, vendors, findings, assessments, activities, signals, users } = useTprm()
  const open = findings.filter((f) => f.status === "open" || f.status === "in_progress").length
  const live = signals.filter((s) => !s.acked).length
  const inFlight = assessments.filter((a) => a.stage !== "monitoring").length

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Tenant administration</p>
        <h1 className="text-2xl font-semibold tracking-tight">Northline Bank</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Users, roles, and policy for the Aegis tenant. Risk desks stay on the InfoSec view.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Directory users" value={users.length} />
        <Stat label="Vendors on register" value={vendors.length} />
        <Stat label="Open findings" value={open} tone="risk" />
        <Stat label="Live alerts" value={live} tone="risk" />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Surface className="p-5 lg:col-span-7">
          <p className="text-xs font-medium text-muted-foreground">Directory</p>
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Who can sign in</h2>
          <ul className="divide-y divide-border">
            {users.slice(0, 8).map((account) => (
              <li key={account.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">{account.name}</p>
                  <p className="text-xs text-muted-foreground">{account.email}</p>
                </div>
                <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium">
                  {roleLabel[account.role]}
                </span>
              </li>
            ))}
          </ul>
          <Button className="mt-4" variant="outline" asChild>
            <Link to="/admin/users">Manage users</Link>
          </Button>
        </Surface>
        <Surface className="p-5 lg:col-span-5">
          <p className="text-xs font-medium text-muted-foreground">Audit</p>
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Recent events</h2>
          <ul className="space-y-3">
            {activities.slice(0, 7).map((item) => (
              <li key={item.id} className="flex gap-2">
                <span
                  className={cn(
                    "mt-1.5 size-1.5 shrink-0 rounded-full bg-primary",
                    item.kind === "signal" && "bg-risk-high",
                    item.kind === "access" && "bg-signal",
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
          <p className="mt-4 text-xs text-muted-foreground">{inFlight} assessments in flight on the InfoSec desk.</p>
        </Surface>
      </div>
    </div>
  )
}

function Stat({ label, value, tone = "score" }: { label: string; value: number; tone?: "risk" | "score" }) {
  return (
    <Surface className="p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">
        <LiveNumber value={value} tone={tone} />
      </p>
    </Surface>
  )
}
