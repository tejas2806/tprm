import { relativeTime } from "@/lib/format"
import { Surface } from "@/components/marks"
import { useTprm } from "@/state/tprm-store"

export function AdminAudit() {
  const { now, activities } = useTprm()
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Assurance</p>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tenant-wide activity, including live ingest and desk actions. Dummy trail, retained in this browser.
        </p>
      </div>
      <Surface className="divide-y divide-border">
        {activities.map((item) => (
          <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3">
            <div>
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.detail}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[11px] uppercase text-muted-foreground">{item.kind}</p>
              <p className="text-xs text-muted-foreground">{relativeTime(item.at, now)}</p>
            </div>
          </div>
        ))}
      </Surface>
    </div>
  )
}
