import { Surface } from "@/components/marks"
import { formatDate } from "@/lib/format"
import { LiveNumber } from "@/components/live-number"
import { useTprm } from "@/state/tprm-store"

export function QuestionnairesPage() {
  const { questionnaires, assessments } = useTprm()
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Library</p>
        <h1 className="text-2xl font-semibold tracking-tight">Questionnaires</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          SIG, overlays, and the Northline inherent model. In-flight counts move as assessments advance.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {questionnaires.map((q) => {
          const live = assessments.filter((a) => a.template.toLowerCase().includes(q.name.split(" ")[0]!.toLowerCase())).length
          return (
            <Surface key={q.id} className="p-5">
              <p className="text-xs font-medium text-primary">{q.focus}</p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight">{q.name}</h2>
              <p className="text-sm text-muted-foreground">v{q.version}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Stat n={q.items} l="items" />
                <Stat n={q.usedBy} l="vendors" />
                <Stat n={live} l="in flight" live />
              </div>
              <p className="mt-4 text-xs text-muted-foreground">Updated {formatDate(q.updated)}</p>
            </Surface>
          )
        })}
      </div>
    </div>
  )
}

function Stat({ n, l, live }: { n: number; l: string; live?: boolean }) {
  return (
    <div className="rounded-lg bg-muted/40 py-2">
      <p className="text-base font-semibold leading-none">
        {live ? <LiveNumber value={n} tone="score" /> : n}
      </p>
      <p className="text-[11px] text-muted-foreground">{l}</p>
    </div>
  )
}
