import { Link } from "react-router-dom"
import { cn } from "cn"
import { Progress } from "@/components/ui/progress"
import { Surface, TierMark } from "@/components/marks"
import { daysUntil, formatDate } from "@/lib/format"
import { useTprm } from "@/state/tprm-store"
import type { Assessment, AssessmentStage, RiskTier } from "@/types"

const columns: { id: AssessmentStage; label: string }[] = [
  { id: "intake", label: "Intake" },
  { id: "scoping", label: "Scoping" },
  { id: "questionnaire", label: "Questionnaire" },
  { id: "review", label: "Review" },
  { id: "decision", label: "Decision" },
  { id: "monitoring", label: "Monitor" },
]

export function AssessmentsPage() {
  const { now, assessments, vendors } = useTprm()
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Pipeline</p>
        <h1 className="text-2xl font-semibold tracking-tight">Assessments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Drag-free kanban. Review is the bottleneck — that is where AI flags live.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {columns.map((col) => {
          const cards = assessments.filter((a) => a.stage === col.id)
          return (
            <div key={col.id} className="min-w-0">
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-xs font-medium text-muted-foreground">
                  {col.label}
                </h2>
                <span className="font-mono text-xs">{cards.length}</span>
              </div>
              <div className="space-y-2">
                {cards.map((card) => (
                  <AssessmentCard key={card.id} now={now} assessment={card} tier={vendors.find((v) => v.id === card.vendorId)?.tier} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AssessmentCard({
  assessment,
  tier,
  now,
}: {
  assessment: Assessment
  tier?: RiskTier
  now: number
}) {
  const due = daysUntil(assessment.due, now)
  return (
    <Link to={`/assessments/${assessment.id}`}>
      <Surface className="p-3 transition-all duration-200 hover:-translate-y-0.5 hover:ring-primary/25">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium">{assessment.vendorName}</p>
          {tier ? <TierMark tier={tier} className="scale-90" /> : null}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{assessment.template}</p>
        <Progress value={assessment.progress} className="mt-3" />
        <p
          className={cn(
            "mt-2 text-xs tabular-nums",
            due <= 3 ? "text-risk-critical" : "text-muted-foreground",
          )}
        >
          {due < 0 ? `${Math.abs(due)}d overdue` : `${due}d · ${formatDate(assessment.due)}`}
        </p>
      </Surface>
    </Link>
  )
}
