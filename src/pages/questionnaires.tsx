import { Link } from "react-router-dom"
import { AssignQuestionnaireForm } from "@/components/assign-questionnaire"
import { Surface } from "@/components/marks"
import { formatDate } from "@/lib/format"
import { LiveNumber } from "@/components/live-number"
import { useTprm } from "@/state/tprm-store"
import type { Assessment, Questionnaire } from "@/types"

function matchesPack(assessment: Assessment, pack: Questionnaire) {
  if (assessment.questionnaireId) return assessment.questionnaireId === pack.id
  const name = pack.name.toLowerCase()
  return assessment.template.toLowerCase().includes(name)
}

export function QuestionnairesPage() {
  const { questionnaires, assessments, vendors } = useTprm()
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Library</p>
        <h1 className="text-2xl font-semibold tracking-tight">Questionnaires</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Default packs live in Firestore. Assign a copy to a vendor — answers land on the assessment, not the template.
        </p>
      </div>

      <Surface className="p-5">
        <p className="text-xs font-medium text-muted-foreground">Assign</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">Send a pack to a vendor</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          InfoSec copies the bank onto an assessment. The vendor answers that copy; you review it in the workspace.
        </p>
        <AssignQuestionnaireForm />
      </Surface>

      {questionnaires.length === 0 ? (
        <Surface className="p-8 text-sm text-muted-foreground">
          Question bank is empty. It seeds into Firestore the first time the desk signs in.
        </Surface>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {questionnaires.map((q) => {
            const assigned = assessments.filter((a) => matchesPack(a, q))
            const live = assigned.filter((a) => a.stage !== "monitoring")
            return (
              <Surface key={q.id} className="flex flex-col p-5">
                <p className="text-xs font-medium text-primary">{q.focus}</p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight">{q.name}</h2>
                <p className="text-sm text-muted-foreground">v{q.version}</p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <Stat n={q.items} l="items" />
                  <Stat n={q.usedBy} l="assigned" />
                  <Stat n={live.length} l="in flight" live />
                </div>
                {q.questions.length > 0 ? (
                  <ol className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                    {q.questions.slice(0, 3).map((item, index) => (
                      <li key={item.id} className="line-clamp-2">
                        {index + 1}. {item.kind === "yes_no" ? "Y/N · " : ""}
                        {item.prompt}
                      </li>
                    ))}
                    {q.questions.length > 3 ? (
                      <li>+{q.questions.length - 3} more in the bank</li>
                    ) : null}
                  </ol>
                ) : (
                  <p className="mt-4 text-xs text-muted-foreground">Questions still loading from Firestore.</p>
                )}
                <ul className="mt-4 space-y-1 text-xs">
                  {assigned.slice(0, 4).map((item) => {
                    const vendor = vendors.find((row) => row.id === item.vendorId)
                    return (
                      <li key={item.id}>
                        <Link to={`/assessments/${item.id}`} className="hover:text-primary">
                          {vendor?.name ?? item.vendorName} · {item.stage} · {item.progress}%
                        </Link>
                      </li>
                    )
                  })}
                  {assigned.length === 0 ? (
                    <li className="text-muted-foreground">Not assigned yet.</li>
                  ) : null}
                </ul>
                <p className="mt-4 text-xs text-muted-foreground">Updated {formatDate(q.updated)}</p>
              </Surface>
            )
          })}
        </div>
      )}
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
