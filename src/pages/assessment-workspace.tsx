import { Link, Navigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { EvidenceLink } from "@/components/evidence-link"
import { QuestionRationale } from "@/components/question-rationale"
import { Surface } from "@/components/marks"
import { cn } from "cn"
import { resolveQuestionMeta } from "@/data/questionnaire-bank"
import { useTprm } from "@/state/tprm-store"
import { formatDate } from "@/lib/format"
import { LiveNumber } from "@/components/live-number"
import type { AiVerdict, QuestionItem } from "@/types"
import { useEffect, useState } from "react"

const verdictTone: Record<AiVerdict, string> = {
  ok: "text-risk-low",
  flag: "text-risk-high",
  gap: "text-risk-critical",
}

export function AssessmentWorkspace() {
  const { id } = useParams()
  const { assessments, markQuestionReviewed, advanceAssessment } = useTprm()
  const assessment = assessments.find((item) => item.id === id)
  const [active, setActive] = useState(0)
  useEffect(() => {
    setActive(0)
  }, [id])
  if (!assessment) return <Navigate to="/assessments" replace />

  const question = assessment.questions[active]
  const flags = assessment.questions.filter((q) => q.ai.verdict !== "ok").length

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Workspace · {assessment.stage}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{assessment.vendorName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {assessment.template} · due {formatDate(assessment.due)} · {assessment.owner}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to={`/vendors/${assessment.vendorId}`}>Dossier</Link>
          </Button>
          <Button
            onClick={() => {
              advanceAssessment(assessment.id)
              toast.success("Stage advanced. Residual will recompute after decision.")
            }}
          >
            Advance stage
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Progress value={assessment.progress} className="flex-1" />
        <span className="font-mono text-xs">
          <LiveNumber value={assessment.progress} tone="score" />%
        </span>
        {flags > 0 ? (
          <Badge variant="destructive">
            <Sparkles data-icon="inline-start" />
            {flags} AI flags
          </Badge>
        ) : null}
      </div>

      {assessment.questions.length === 0 ? (
        <Surface className="p-8 text-sm text-muted-foreground">
          Questionnaire not returned yet. Watchtower will ping when the TAM submits.
        </Surface>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr_320px]">
          <Surface className="p-2">
            <p className="px-2 py-2 text-xs font-medium text-muted-foreground">
              Questions
            </p>
            {assessment.questions.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActive(i)}
                className={cn(
                  "flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors duration-150",
                  i === active ? "bg-muted" : "hover:bg-muted/50",
                )}
              >
                <span
                  className={cn(
                    "mt-1 size-1.5 shrink-0 rounded-full",
                    item.ai.verdict === "ok" && "bg-risk-low",
                    item.ai.verdict === "flag" && "bg-risk-high",
                    item.ai.verdict === "gap" && "bg-risk-critical",
                  )}
                />
                <span>
                  <span className="block font-medium">{item.domain}</span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">
                    {resolveQuestionMeta(item).kind === "yes_no" ? "Yes/No · " : ""}
                    {item.prompt}
                  </span>
                </span>
              </button>
            ))}
          </Surface>

          {question ? (
            <>
              <Surface key={question.id} className="fade-in p-5">
                <p className="font-mono text-[11px] text-muted-foreground">
                  {question.domain}
                  {resolveQuestionMeta(question).kind === "yes_no" ? " · Yes / No" : " · Free text"}
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight">{question.prompt}</h2>
                <div className="mt-3">
                  <QuestionRationale text={resolveQuestionMeta(question).rationale} />
                </div>
                <div className="mt-4 rounded-xl bg-muted/40 p-4 text-sm leading-relaxed">
                  {question.answer.trim() ? (
                    resolveQuestionMeta(question).kind === "yes_no" ? (
                      <span className="font-semibold">{question.answer}</span>
                    ) : (
                      question.answer
                    )
                  ) : (
                    "No vendor response yet."
                  )}
                </div>
                {question.comment?.trim() ? (
                  <div className="mt-3 rounded-xl bg-muted/25 p-4 text-sm leading-relaxed">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Vendor comment</p>
                    <p className="mt-1">{question.comment}</p>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">No vendor comment.</p>
                )}
                <p className="mt-3 font-mono text-xs text-muted-foreground">
                  Evidence ·{" "}
                  {question.evidence.trim() || question.evidenceUrl ? (
                    <EvidenceLink
                      href={question.evidenceUrl}
                      label={question.evidence.trim() || "Open document"}
                      className="font-mono text-xs"
                    />
                  ) : (
                    "—"
                  )}
                </p>
                <div className="mt-6 flex gap-2">
                  <Button
                    disabled={question.reviewed}
                    onClick={() => {
                      markQuestionReviewed(assessment.id, question.id)
                      toast.success("Marked reviewed. Residual unchanged until flags close.")
                    }}
                  >
                    {question.reviewed ? "Reviewed" : "Accept answer"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => toast.message("Comment sent to the vendor TAM.")}
                  >
                    Ask TAM
                  </Button>
                </div>
              </Surface>
              <AiPanel key={`${question.id}-ai`} question={question} />
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}

function AiPanel({ question }: { question: QuestionItem }) {
  return (
    <Surface className="fade-in p-5">
      <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Sparkles className="size-3.5 text-primary" />
        Review assist
      </p>
      <p className={cn("mt-3 text-2xl font-semibold tabular-nums tracking-tight capitalize", verdictTone[question.ai.verdict])}>
        {question.ai.verdict}
      </p>
      <p className="mt-2 text-sm leading-relaxed">{question.ai.note}</p>
      <p className="mt-4 font-mono text-[11px] text-muted-foreground">
        Confidence {question.ai.confidence}% · compared to prior SIG, DPA, and rating feed
      </p>
    </Surface>
  )
}
