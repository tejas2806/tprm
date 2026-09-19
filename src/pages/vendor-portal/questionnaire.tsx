import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { FileUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { EvidenceLink } from "@/components/evidence-link"
import { QuestionRationale } from "@/components/question-rationale"
import { Surface } from "@/components/marks"
import { resolveQuestionMeta } from "@/data/questionnaire-bank"
import { formatDate } from "@/lib/format"
import { uploadQuestionEvidence } from "@/lib/storage"
import { useAuth } from "@/state/auth"
import { useTprm } from "@/state/tprm-store"
import type { Assessment, QuestionItem, QuestionKind } from "@/types"
import { cn } from "cn"

export function VendorQuestionnaire() {
  const { user } = useAuth()
  const { assessments, updateQuestionResponse } = useTprm()
  const mine = useMemo(
    () => assessments.filter((item) => item.vendorId === user?.vendorId),
    [assessments, user?.vendorId],
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [active, setActive] = useState(0)

  const assessment =
    mine.find((item) => item.id === selectedId) ??
    mine.find((item) => item.questions.length > 0) ??
    mine[0]

  useEffect(() => {
    if (assessment && assessment.id !== selectedId) setSelectedId(assessment.id)
  }, [assessment, selectedId])

  useEffect(() => {
    setActive(0)
  }, [assessment?.id])

  if (!assessment) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Questionnaires</h1>
        <p className="text-sm text-muted-foreground">
          Northline has not assigned a questionnaire to this vendor yet. Check back after InfoSec sends a pack.
        </p>
      </div>
    )
  }

  const question = assessment.questions[active]
  const answered = assessment.questions.filter((item) => item.answer.trim()).length

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Return to Northline</p>
        <h1 className="text-2xl font-semibold tracking-tight">Questionnaires</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Answer Yes/No or free text, add a comment, and attach evidence. Each save writes to Firestore.
        </p>
      </div>

      {mine.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {mine.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              className={cn(
                "rounded-lg px-3 py-2 text-left text-sm ring-1 ring-border",
                item.id === assessment.id ? "bg-muted" : "hover:bg-muted/50",
              )}
            >
              <span className="block font-medium">{item.template}</span>
              <span className="text-xs text-muted-foreground">
                {item.progress}% · {item.stage}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <PackHeader assessment={assessment} answered={answered} />

      {assessment.questions.length === 0 ? (
        <Surface className="p-8 text-sm text-muted-foreground">
          Scoping is still open on the bank side. You will be notified when questions land.
        </Surface>
      ) : question ? (
        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <Surface className="p-2">
            {assessment.questions.map((item, index) => {
              const meta = resolveQuestionMeta(item)
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActive(index)}
                  className={cn(
                    "flex w-full items-start justify-between gap-2 rounded-md px-2 py-2 text-left text-sm",
                    index === active ? "bg-muted" : "hover:bg-muted/50",
                  )}
                >
                  <span className="min-w-0 truncate">{item.domain}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {meta.kind === "yes_no" ? "Y/N · " : ""}
                    {item.answer.trim() ? (item.reviewed ? "reviewed" : "saved") : "open"}
                  </span>
                </button>
              )
            })}
          </Surface>
          <QuestionForm
            key={question.id}
            vendorId={assessment.vendorId}
            assessmentId={assessment.id}
            question={question}
            onSave={async (payload) => {
              await updateQuestionResponse(assessment.id, question.id, payload)
            }}
          />
        </div>
      ) : null}
    </div>
  )
}

function PackHeader({ assessment, answered }: { assessment: Assessment; answered: number }) {
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight">{assessment.template}</h2>
      <p className="text-sm text-muted-foreground">
        Due {formatDate(assessment.due)} · {assessment.stage} · {answered}/{assessment.questions.length || 0} answered
      </p>
      <div className="mt-3 flex items-center gap-3">
        <Progress value={assessment.progress} className="flex-1" />
        <span className="font-mono text-xs">{assessment.progress}%</span>
      </div>
    </div>
  )
}

function QuestionForm({
  vendorId,
  assessmentId,
  question,
  onSave,
}: {
  vendorId: string
  assessmentId: string
  question: QuestionItem
  onSave: (input: { answer: string; evidence: string; evidenceUrl?: string; comment?: string }) => Promise<void>
}) {
  const meta = resolveQuestionMeta(question)
  const [answer, setAnswer] = useState(normalizeAnswer(question.answer, meta.kind))
  const [comment, setComment] = useState(question.comment ?? "")
  const [file, setFile] = useState<File | null>(null)
  const [evidence, setEvidence] = useState(question.evidence)
  const [evidenceUrl, setEvidenceUrl] = useState(question.evidenceUrl)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function submit() {
    if (!answer.trim()) {
      toast.error(meta.kind === "yes_no" ? "Choose Yes or No before sending it to Northline." : "Write an answer before sending it to Northline.")
      return
    }
    setBusy(true)
    try {
      let name = evidence
      let url = evidenceUrl
      if (file) {
        const uploaded = await uploadQuestionEvidence({
          vendorId,
          assessmentId,
          questionId: question.id,
          file,
        })
        name = uploaded.name
        url = uploaded.url
        setEvidence(name)
        setEvidenceUrl(url)
        setFile(null)
      }
      await onSave({ answer, evidence: name, evidenceUrl: url, comment })
      toast.success("Answer saved. InfoSec can see it on the assessment.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save that answer.")
    } finally {
      setBusy(false)
    }
  }

  const attached = file?.name || evidence

  return (
    <Surface className="space-y-3 p-5">
      <p className="font-mono text-[11px] text-muted-foreground">
        {question.domain}
        {meta.kind === "yes_no" ? " · Yes / No" : " · Free text"}
      </p>
      <p className="text-sm font-medium">{question.prompt}</p>
      <QuestionRationale text={meta.rationale} />
      {meta.kind === "yes_no" ? (
        <div className="space-y-1.5">
          <Label>Your answer</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["Yes", "No"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setAnswer(option)}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium ring-1 transition-colors",
                  answer === option
                    ? option === "Yes"
                      ? "bg-risk-low/15 text-foreground ring-risk-low/40"
                      : "bg-risk-critical/15 text-foreground ring-risk-critical/40"
                    : "ring-border hover:bg-muted/50",
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="answer">Your answer</Label>
          <Textarea id="answer" rows={5} value={answer} onChange={(event) => setAnswer(event.target.value)} />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="comment">Comment</Label>
        <Textarea
          id="comment"
          rows={3}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder={
            meta.kind === "yes_no"
              ? answer === "No"
                ? "If no, explain the gap or compensating control."
                : "Optional: name the control, owner, or certificate."
              : "Optional context for Northline InfoSec."
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="evidence-file">Evidence</Label>
        <input
          ref={inputRef}
          id="evidence-file"
          type="file"
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.csv,.txt,.xlsx,.xls,.docx,.doc,.zip"
          onChange={(event) => {
            const next = event.target.files?.[0] ?? null
            setFile(next)
            if (next) setEvidence(next.name)
          }}
        />
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-input px-3 py-3">
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <FileUp />
            {attached ? "Replace document" : "Upload document"}
          </Button>
          {attached ? (
            evidenceUrl && !file ? (
              <EvidenceLink href={evidenceUrl} label={attached} className="text-sm" />
            ) : (
              <span className="truncate text-sm text-muted-foreground">{attached}</span>
            )
          ) : (
            <span className="text-xs text-muted-foreground">SOC 2, AoC, scan, or policy extract · 10 MB</span>
          )}
        </div>
      </div>
      <Button disabled={busy} onClick={() => void submit()}>
        {busy ? "Saving…" : "Submit to Northline"}
      </Button>
    </Surface>
  )
}

function normalizeAnswer(answer: string, kind: QuestionKind) {
  if (kind !== "yes_no") return answer
  const value = answer.trim().toLowerCase()
  if (value === "yes" || value.startsWith("yes")) return "Yes"
  if (value === "no" || value.startsWith("no")) return "No"
  return ""
}
