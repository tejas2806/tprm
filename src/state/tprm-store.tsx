import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  addDoc,
  doc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore"
import { toast } from "sonner"
import { liveEvents, progressTicks, ratingTicks } from "@/data/live-feed"
import { defaultTenantId, getDb } from "@/lib/firebase"
import {
  DEFAULT_POLICY,
  dedupeUsers,
  findingDeadline,
  mapActivity,
  mapAssessment,
  mapFinding,
  mapPolicy,
  mapQuestion,
  mapQuestionnaire,
  mapQuestionnaireItem,
  mapSignal,
  mapUser,
  mapVendor,
  omitUndefined,
  vendorToDoc,
} from "@/lib/firestore/mappers"
import {
  activitiesCol,
  assessmentRef,
  assessmentsCol,
  findingsCol,
  kpiRef,
  policyRef,
  questionRef,
  questionnaireItemsCol,
  questionnaireRef,
  questionnairesCol,
  questionsCol,
  signalsCol,
  emailRef,
  usersCol,
  valuationRef,
  valuationsCol,
  vendorRef,
  vendorsCol,
} from "@/lib/firestore/paths"
import { upsertUserProfile } from "@/lib/firestore/profile"
import { ensureQuestionBank, ensureTenantSeeded } from "@/lib/firestore/seed-tenant"
import { bumpInFlightAssessments, bumpVendorOpenFindings, bumpVendorOpenSignals, writeVendorValuation } from "@/lib/firestore/writes"
import { scoreInherent, tierFromScore } from "@/lib/risk"
import { useAuth } from "@/state/auth"
import type {
  ActivityEvent,
  Assessment,
  AssessmentStage,
  Certification,
  DirectoryUser,
  Finding,
  FindingStatus,
  IntakeDraft,
  Policy,
  QuestionBankItem,
  QuestionItem,
  Questionnaire,
  Signal,
  Vendor,
} from "@/types"
import type { ValuationDoc } from "@/lib/firestore/schema"

type TprmContextValue = {
  now: number
  lastIngestAt: number
  ready: boolean
  loadError: string | null
  vendors: Vendor[]
  assessments: Assessment[]
  findings: Finding[]
  signals: Signal[]
  questionnaires: Questionnaire[]
  activities: ActivityEvent[]
  users: DirectoryUser[]
  policies: Policy
  residualTrend: number[]
  alertTrend: number[]
  addVendorFromIntake: (draft: IntakeDraft) => Promise<{ vendor: Vendor; assessment: Assessment }>
  ackSignal: (id: string) => Promise<void>
  ackAllSignals: () => Promise<void>
  setFindingStatus: (id: string, status: FindingStatus) => Promise<void>
  markQuestionReviewed: (assessmentId: string, questionId: string) => Promise<void>
  advanceAssessment: (id: string) => Promise<void>
  updateQuestionResponse: (
    assessmentId: string,
    questionId: string,
    input: { answer: string; evidence: string; evidenceUrl?: string; comment?: string },
  ) => Promise<void>
  respondToFinding: (id: string, note: string) => Promise<void>
  addVendorEvidence: (vendorId: string, cert: Certification) => Promise<void>
  assignQuestionnaire: (vendorId: string, questionnaireId: string) => Promise<{ assessment: Assessment }>
  addDirectoryUser: (input: {
    name: string
    email: string
    role: DirectoryUser["role"]
    vendorId?: string
    vendorName?: string
  }) => Promise<void>
  savePolicies: (next: Policy) => Promise<void>
}

const STAGES: AssessmentStage[] = ["intake", "scoping", "questionnaire", "review", "decision", "monitoring"]

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function matchRegisterVendor(company: string, vendors: Vendor[]) {
  const needle = company.trim().toLowerCase()
  if (!needle) return undefined
  const slug = needle.replace(/[^a-z0-9]+/g, "").slice(0, 12)
  return vendors.find(
    (vendor) =>
      vendor.id === needle ||
      vendor.id === `vnd_${slug}` ||
      vendor.id.replace(/^vnd_/, "") === slug ||
      vendor.name.toLowerCase() === needle ||
      vendor.legalName.toLowerCase() === needle,
  )
}

function requireDb(): Firestore {
  const db = getDb()
  if (!db) throw new Error("Firestore is not configured.")
  return db
}

async function logActivity(
  db: Firestore,
  tenantId: string,
  kind: ActivityEvent["kind"],
  title: string,
  detail: string,
) {
  await addDoc(activitiesCol(db, tenantId), {
    at: new Date().toISOString(),
    kind,
    title,
    detail,
  })
}

function listenError(scope: string, onError?: (message: string) => void) {
  return (error: Error) => {
    console.error(`[tprm] ${scope}`, error)
    onError?.(`${scope}: ${error.message}`)
  }
}

const TprmContext = createContext<TprmContextValue | null>(null)

export function TprmProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const tenantId = defaultTenantId
  const liveIndex = useRef(0)
  const ratingIndex = useRef(0)
  const tickRef = useRef(0)
  const vendorsRef = useRef<Vendor[]>([])
  const signalsRef = useRef<Signal[]>([])
  const assessmentsRef = useRef<Assessment[]>([])
  const findingsRef = useRef<Finding[]>([])
  const policiesRef = useRef<Policy>(DEFAULT_POLICY)
  const residualTrendRef = useRef<number[]>([])
  const alertTrendRef = useRef<number[]>([])

  const [now, setNow] = useState(() => Date.now())
  const [lastIngestAt, setLastIngestAt] = useState(() => Date.now() - 4_000)
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [assessmentRows, setAssessmentRows] = useState<Omit<Assessment, "questions">[]>([])
  const [questionsByAssessment, setQuestionsByAssessment] = useState<Record<string, QuestionItem[]>>({})
  const [findings, setFindings] = useState<Finding[]>([])
  const [signals, setSignals] = useState<Signal[]>([])
  const questionnairesRef = useRef<Questionnaire[]>([])
  const [questionnaireRows, setQuestionnaireRows] = useState<Questionnaire[]>([])
  const [bankById, setBankById] = useState<Record<string, QuestionBankItem[]>>({})
  const [activities, setActivities] = useState<ActivityEvent[]>([])
  const [users, setUsers] = useState<DirectoryUser[]>([])
  const [policies, setPolicies] = useState<Policy>(DEFAULT_POLICY)
  const [valuations, setValuations] = useState<Record<string, ValuationDoc>>({})
  const [residualTrend, setResidualTrend] = useState<number[]>([])
  const [alertTrend, setAlertTrend] = useState<number[]>([])

  const desk = user?.role === "admin" || user?.role === "infosec"
  const vendorScope = user?.role === "vendor" ? user.vendorId : undefined

  const assessments = useMemo<Assessment[]>(
    () =>
      assessmentRows.map((row) => ({
        ...row,
        questions: questionsByAssessment[row.id] ?? [],
      })),
    [assessmentRows, questionsByAssessment],
  )

  const questionnaires = useMemo(
    () =>
      questionnaireRows.map((row) => {
        const questions = bankById[row.id] ?? row.questions ?? []
        return { ...row, questions, items: questions.length || row.items }
      }),
    [questionnaireRows, bankById],
  )

  const scoredVendors = useMemo(() => {
    return vendors.map((vendor) => {
      const valuation = valuations[vendor.id]
      if (!valuation) return vendor
      return {
        ...vendor,
        inherent: valuation.inherent,
        residual: valuation.residual,
        securityRating: valuation.securityRating,
      }
    })
  }, [vendors, valuations])

  vendorsRef.current = scoredVendors
  signalsRef.current = signals
  assessmentsRef.current = assessments
  findingsRef.current = findings
  questionnairesRef.current = questionnaires
  policiesRef.current = policies
  residualTrendRef.current = residualTrend
  alertTrendRef.current = alertTrend

  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(clock)
  }, [])

  useEffect(() => {
    const db = getDb()
    if (!db || !user) {
      setVendors([])
      setAssessmentRows([])
      setQuestionsByAssessment({})
      setFindings([])
      setSignals([])
      setQuestionnaireRows([])
      setBankById({})
      setActivities([])
      setUsers([])
      setValuations({})
      setResidualTrend([])
      setAlertTrend([])
      setReady(!user)
      return
    }

    let cancelled = false
    const unsubs: Unsubscribe[] = []
    setReady(false)

    const start = async () => {
      try {
        await upsertUserProfile(user)
      } catch (error) {
        console.error("[tprm] profile", error)
      }
      try {
        if (desk) {
          await ensureTenantSeeded(db, tenantId)
          await ensureQuestionBank(db, tenantId)
        }
      } catch (error) {
        console.error("[tprm] seed", error)
      }
      if (cancelled) return

      if (user.role === "vendor") {
        if (!vendorScope) {
          setReady(true)
          return
        }
        unsubs.push(
          onSnapshot(vendorRef(db, tenantId, vendorScope), (snap) => {
            setVendors(snap.exists() ? [mapVendor(snap.id, snap.data())] : [])
          }, listenError("vendor")),
        )
        unsubs.push(
          onSnapshot(
            query(assessmentsCol(db, tenantId), where("vendorId", "==", vendorScope)),
            (snap) => setAssessmentRows(snap.docs.map((row) => mapAssessment(row.id, row.data()))),
            listenError("assessments"),
          ),
        )
        unsubs.push(
          onSnapshot(
            query(findingsCol(db, tenantId), where("vendorId", "==", vendorScope)),
            (snap) => setFindings(snap.docs.map((row) => mapFinding(row.id, row.data()))),
            listenError("findings"),
          ),
        )
        unsubs.push(
          onSnapshot(
            query(signalsCol(db, tenantId), where("vendorId", "==", vendorScope)),
            (snap) => setSignals(snap.docs.map((row) => mapSignal(row.id, row.data()))),
            listenError("signals"),
          ),
        )
        unsubs.push(
          onSnapshot(valuationRef(db, tenantId, vendorScope), (snap) => {
            setValuations(snap.exists() ? { [vendorScope]: snap.data() as ValuationDoc } : {})
          }, listenError("valuation")),
        )
      } else {
        unsubs.push(
          onSnapshot(vendorsCol(db, tenantId), (snap) => {
            setLoadError(null)
            setVendors(snap.docs.map((row) => mapVendor(row.id, row.data())))
          }, listenError("vendors", setLoadError)),
        )
        unsubs.push(
          onSnapshot(assessmentsCol(db, tenantId), (snap) => {
            setAssessmentRows(snap.docs.map((row) => mapAssessment(row.id, row.data())))
          }, listenError("assessments")),
        )
        unsubs.push(
          onSnapshot(findingsCol(db, tenantId), (snap) => {
            setFindings(snap.docs.map((row) => mapFinding(row.id, row.data())))
          }, listenError("findings")),
        )
        unsubs.push(
          onSnapshot(signalsCol(db, tenantId), (snap) => {
            setSignals(snap.docs.map((row) => mapSignal(row.id, row.data())))
          }, listenError("signals")),
        )
        unsubs.push(
          onSnapshot(valuationsCol(db, tenantId), (snap) => {
            const next: Record<string, ValuationDoc> = {}
            for (const row of snap.docs) next[row.id] = row.data() as ValuationDoc
            setValuations(next)
          }, listenError("valuations")),
        )
        unsubs.push(
          onSnapshot(questionnairesCol(db, tenantId), (snap) => {
            setQuestionnaireRows(snap.docs.map((row) => mapQuestionnaire(row.id, row.data())))
          }, listenError("questionnaires")),
        )
        unsubs.push(
          onSnapshot(
            query(activitiesCol(db, tenantId), orderBy("at", "desc"), limit(40)),
            (snap) => setActivities(snap.docs.map((row) => mapActivity(row.id, row.data()))),
            listenError("activities"),
          ),
        )
        unsubs.push(
          onSnapshot(usersCol(db, tenantId), (snap) => {
            setUsers(dedupeUsers(snap.docs.map((row) => mapUser(row.id, row.data()))))
          }, listenError("users")),
        )
        unsubs.push(
          onSnapshot(kpiRef(db, tenantId), (snap) => {
            const data = snap.data()
            if (!data) return
            if (Array.isArray(data.residualTrend)) setResidualTrend(data.residualTrend)
            if (Array.isArray(data.alertTrend)) setAlertTrend(data.alertTrend)
          }, listenError("kpis")),
        )
      }

      unsubs.push(
        onSnapshot(policyRef(db, tenantId), (snap) => {
          setPolicies(mapPolicy(snap.data()))
        }, listenError("policies")),
      )

      setReady(true)
    }

    void start()
    return () => {
      cancelled = true
      unsubs.forEach((unsub) => unsub())
    }
  }, [user, desk, vendorScope, tenantId])

  const assessmentIds = assessmentRows.map((row) => row.id).sort().join(",")

  useEffect(() => {
    const db = getDb()
    if (!db || !user || !assessmentIds) {
      setQuestionsByAssessment({})
      return
    }
    const ids = assessmentIds.split(",").filter(Boolean)
    const unsubs = ids.map((id) =>
      onSnapshot(
        query(questionsCol(db, tenantId, id), orderBy("order")),
        (snap) => {
          setQuestionsByAssessment((prev) => ({
            ...prev,
            [id]: snap.docs.map((row) => mapQuestion(row.id, row.data())),
          }))
        },
        listenError(`questions:${id}`),
      ),
    )
    return () => unsubs.forEach((unsub) => unsub())
  }, [user, tenantId, assessmentIds])

  const questionnaireIds = questionnaireRows.map((row) => row.id).sort().join(",")

  useEffect(() => {
    const db = getDb()
    if (!db || !user || !desk || !questionnaireIds) {
      setBankById({})
      return
    }
    const ids = questionnaireIds.split(",").filter(Boolean)
    const unsubs = ids.map((id) =>
      onSnapshot(
        query(questionnaireItemsCol(db, tenantId, id), orderBy("order")),
        (snap) => {
          setBankById((prev) => ({
            ...prev,
            [id]: snap.docs.map((row) => mapQuestionnaireItem(row.id, row.data())),
          }))
        },
        listenError(`bank:${id}`),
      ),
    )
    return () => unsubs.forEach((unsub) => unsub())
  }, [user, desk, tenantId, questionnaireIds])

  useEffect(() => {
    if (!desk || users.length === 0) return
    const db = getDb()
    if (!db) return
    void Promise.all(
      users.map((row) =>
        setDoc(
          emailRef(db, tenantId, row.email),
          omitUndefined({
            userId: row.id,
            email: row.email,
            name: row.name,
            title: row.title,
            role: row.role,
            vendorId: row.vendorId,
            vendorName: row.vendorName,
            active: row.active,
          }),
          { merge: true },
        ).catch(listenError(`email:${row.email}`)),
      ),
    )
  }, [desk, tenantId, users])

  useEffect(() => {
    if (!user || !desk) return
    const db = getDb()
    if (!db) return

    const ingestSignal = async () => {
      const event = liveEvents[liveIndex.current % liveEvents.length]!
      liveIndex.current += 1
      const at = new Date().toISOString()
      const bump =
        event.severity === "critical" ? 4 : event.severity === "high" ? 2 : event.severity === "low" ? -1 : 1
      const vendor = vendorsRef.current.find((item) => item.id === event.vendorId)
      await addDoc(signalsCol(db, tenantId), { ...event, at, acked: false })
      await bumpVendorOpenSignals(db, tenantId, event.vendorId, 1)
      if (vendor) {
        const residual = clamp(vendor.residual + Math.max(0, bump), 8, 99)
        const securityRating = clamp(vendor.securityRating - bump, 38, 99)
        await updateDoc(vendorRef(db, tenantId, vendor.id), { residual, securityRating, updatedAt: at })
        await writeVendorValuation(db, tenantId, {
          vendorId: vendor.id,
          vendorName: vendor.name,
          inherent: vendor.inherent,
          residual,
          securityRating,
        })
      }
      if (event.severity === "critical") {
        const exists = findingsRef.current.some(
          (item) => item.vendorId === event.vendorId && item.title === event.title,
        )
        if (!exists) {
          const finding: Finding = {
            id: `fnd_live_${Date.now()}`,
            vendorId: event.vendorId,
            vendorName: event.vendorName,
            title: event.title,
            detail: event.detail,
            severity: event.severity,
            status: "open",
            slaDays: policiesRef.current.criticalSlaDays,
            owner: "Suyog Khairnar",
            control: "MON-01",
            opened: at.slice(0, 10),
          }
          await setDoc(doc(findingsCol(db, tenantId), finding.id), {
            ...finding,
            slaDeadline: findingDeadline(finding),
            updatedAt: at,
          })
          await bumpVendorOpenFindings(db, tenantId, event.vendorId, 1)
        }
      }
      await logActivity(db, tenantId, "signal", `${event.vendorName} · ${event.title}`, event.detail)
      setLastIngestAt(Date.now())
      if (event.severity === "critical" || event.severity === "high") {
        toast.warning(`${event.vendorName}: ${event.title}`, { duration: 4200 })
      }
    }

    const ingestRating = async () => {
      const tick = ratingTicks[ratingIndex.current % ratingTicks.length]!
      ratingIndex.current += 1
      const at = new Date().toISOString()
      const vendor = vendorsRef.current.find((item) => item.id === tick.vendorId)
      if (vendor) {
        const securityRating = clamp(vendor.securityRating + tick.delta, 38, 99)
        const residual = clamp(vendor.residual - tick.delta, 8, 99)
        await updateDoc(vendorRef(db, tenantId, vendor.id), { residual, securityRating, updatedAt: at })
        await writeVendorValuation(db, tenantId, {
          vendorId: vendor.id,
          vendorName: vendor.name,
          inherent: vendor.inherent,
          residual,
          securityRating,
        })
      }
      await logActivity(
        db,
        tenantId,
        "rating",
        `${tick.vendorName} rating ${tick.delta > 0 ? "↑" : "↓"} ${Math.abs(tick.delta)}`,
        tick.detail,
      )
      setLastIngestAt(Date.now())
    }

    const ingestProgress = async () => {
      const open = assessmentsRef.current.filter((item) => item.stage !== "monitoring" && item.progress < 99)
      const target = open[liveIndex.current % Math.max(open.length, 1)]
      if (!target) return
      const hint = progressTicks.find((item) => item.stage === target.stage) ?? progressTicks[1]!
      const step = target.stage === "review" ? 2 : 3
      const progress = clamp(target.progress + step, 0, 99)
      await updateDoc(assessmentRef(db, tenantId, target.id), {
        progress,
        updatedAt: new Date().toISOString(),
      })
      await logActivity(db, tenantId, "assessment", `${target.vendorName} ${progress}%`, hint.note)
      setLastIngestAt(Date.now())
    }

    const ingest = () => {
      if (document.hidden || !policiesRef.current.watchtower) return
      const lane = tickRef.current % 5
      tickRef.current += 1
      const run =
        lane === 0 || lane === 2 ? ingestSignal : lane === 4 ? ingestProgress : ingestRating
      void run().catch(listenError("ingest"))
    }

    const first = window.setTimeout(ingest, 1800)
    const feed = window.setInterval(ingest, 4000)
    const sample = window.setInterval(() => {
      if (document.hidden) return
      const list = vendorsRef.current
      if (list.length === 0) return
      const avg = list.reduce((sum, vendor) => sum + vendor.residual, 0) / list.length
      const residual = [...residualTrendRef.current.slice(-13), Math.round(avg * 10) / 10]
      const alerts = [...alertTrendRef.current.slice(-13), signalsRef.current.filter((item) => !item.acked).length]
      void updateDoc(kpiRef(db, tenantId), {
        residualTrend: residual,
        alertTrend: alerts,
        avgResidual: Math.round(avg * 10) / 10,
        openAlerts: signalsRef.current.filter((item) => !item.acked).length,
        updatedAt: new Date().toISOString(),
      }).catch(listenError("kpi-sample"))
    }, 5000)
    const onVisible = () => {
      if (!document.hidden) ingest()
    }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      window.clearTimeout(first)
      window.clearInterval(feed)
      window.clearInterval(sample)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [user, desk, tenantId])

  const addVendorFromIntake = useCallback(async (draft: IntakeDraft) => {
    const db = requireDb()
    const { score, dna } = scoreInherent(draft)
    const slug = draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 12) || "new"
    const taken = vendorsRef.current.some((vendor) => vendor.id === `vnd_${slug}`)
    const id = taken ? `vnd_${slug}_${Date.now().toString(36)}` : `vnd_${slug}`
    const nowIso = new Date().toISOString()
    const vendor: Vendor = {
      id,
      name: draft.name,
      legalName: draft.name,
      category: draft.category,
      owner: draft.owner,
      businessUnit: draft.businessUnit,
      tier: tierFromScore(score),
      status: "intake",
      inherent: score,
      residual: score,
      inherentDna: dna,
      dataClasses: draft.dataClasses,
      hosting: draft.hosting,
      geos: draft.geos,
      subprocessors: [],
      certifications: draft.hasSoc2
        ? [{ name: "SOC 2 Type II", expires: "2027-09-10", status: "valid" }]
        : [],
      contractEnd: "2027-09-10",
      lastAssessed: nowIso.slice(0, 10),
      nextReview: new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10),
      securityRating: 50,
      spend: "TBD",
      description: draft.description,
      website: `${draft.name.toLowerCase().replace(/\s+/g, "")}.example`,
      contacts: [],
      products: [draft.category],
      updatedAt: nowIso,
    }
    const assessment: Assessment = {
      id: `asm_${id.slice(4)}`,
      vendorId: id,
      vendorName: draft.name,
      template: score >= 55 ? "SIG Core" : "SIG Lite",
      stage: "intake",
      due: vendor.nextReview,
      owner: draft.owner,
      progress: 6,
      questions: [],
    }
    await setDoc(vendorRef(db, tenantId, id), vendorToDoc(vendor, { openFindingCount: 0, openSignalCount: 0, inFlightAssessmentCount: 1 }))
    await writeVendorValuation(db, tenantId, {
      vendorId: id,
      vendorName: vendor.name,
      inherent: score,
      residual: score,
      securityRating: 50,
    })
    const starterQuestions = [
      {
        id: "iq1",
        domain: "Governance",
        kind: "text" as const,
        prompt: "Who is the named security contact, and what is the incident-notification SLA?",
        rationale: "A named contact is how Watchtower alerts reach someone who can act the same day.",
        answer: "",
        comment: "",
        evidence: "",
        ai: { verdict: "gap" as const, note: "No response yet. Hold residual until the TAM replies.", confidence: 70 },
        reviewed: false,
        order: 0,
      },
      {
        id: "iq2",
        domain: "Data",
        kind: "text" as const,
        prompt: "Which Northline data classes will this service store or process?",
        rationale: "Data class drives inherent score and which overlay (PCI, BPO, AI) we attach.",
        answer: draft.dataClasses.join(", ") || "",
        comment: "",
        evidence: "",
        ai: {
          verdict: draft.dataClasses.length ? "ok" as const : "gap" as const,
          note: draft.dataClasses.length ? "Matches intake selection." : "Data classes were not declared at intake.",
          confidence: 80,
        },
        reviewed: false,
        order: 1,
      },
      {
        id: "iq3",
        domain: "Access",
        kind: "yes_no" as const,
        prompt: "Does this vendor receive production or privileged access to Northline systems?",
        rationale: "Privileged access jumps inherent and puts vaulting evidence in scope.",
        answer: draft.prodAccess ? "Yes" : "No",
        comment: draft.prodAccess ? "Production or privileged access declared at intake." : "No production access declared at intake.",
        evidence: "",
        ai: {
          verdict: draft.prodAccess ? "flag" as const : "ok" as const,
          note: draft.prodAccess ? "Privileged access — confirm vaulting and unique break-glass." : "No privileged path declared.",
          confidence: 84,
        },
        reviewed: false,
        order: 2,
      },
    ]
    await setDoc(assessmentRef(db, tenantId, assessment.id), {
      vendorId: id,
      vendorName: draft.name,
      template: assessment.template,
      stage: "questionnaire",
      due: assessment.due,
      owner: draft.owner,
      progress: 6,
      questionCount: starterQuestions.length,
      flagCount: starterQuestions.filter((item) => item.ai.verdict !== "ok").length,
      updatedAt: nowIso,
    })
    await Promise.all(
      starterQuestions.map((question) =>
        setDoc(questionRef(db, tenantId, assessment.id, question.id), {
          vendorId: id,
          assessmentId: assessment.id,
          domain: question.domain,
          prompt: question.prompt,
          kind: question.kind,
          rationale: question.rationale,
          answer: question.answer,
          comment: question.comment,
          evidence: question.evidence,
          ai: question.ai,
          reviewed: question.reviewed,
          order: question.order,
          updatedAt: nowIso,
        }),
      ),
    )
    await setDoc(
      kpiRef(db, tenantId),
      {
        vendorCount: increment(1),
        inFlightAssessments: increment(1),
        materialCount: increment(vendor.tier === "critical" || vendor.tier === "high" ? 1 : 0),
        updatedAt: nowIso,
      },
      { merge: true },
    ).catch(listenError("intake-kpi"))
    await logActivity(db, tenantId, "intake", `${vendor.name} added to the register`, `Inherent ${score} · ${vendor.tier}`).catch(
      listenError("intake-activity"),
    )
    return { vendor, assessment: { ...assessment, stage: "questionnaire" as const, questions: starterQuestions } }
  }, [tenantId])

  const ackSignal = useCallback(async (id: string) => {
    const db = requireDb()
    const target = signalsRef.current.find((item) => item.id === id)
    if (!target || target.acked) return
    await updateDoc(doc(signalsCol(db, tenantId), id), { acked: true })
    await bumpVendorOpenSignals(db, tenantId, target.vendorId, -1)
    await logActivity(db, tenantId, "ack", `Acknowledged ${target.vendorName}`, target.title)
  }, [tenantId])

  const ackAllSignals = useCallback(async () => {
    const db = requireDb()
    const open = signalsRef.current.filter((item) => !item.acked)
    await Promise.all(
      open.map((item) =>
        updateDoc(doc(signalsCol(db, tenantId), item.id), { acked: true }).then(() =>
          bumpVendorOpenSignals(db, tenantId, item.vendorId, -1),
        ),
      ),
    )
    if (open.length) await logActivity(db, tenantId, "ack", "Acknowledged all open signals", "Ticker cleared")
  }, [tenantId])

  const setFindingStatus = useCallback(async (id: string, status: FindingStatus) => {
    const db = requireDb()
    const current = findingsRef.current.find((item) => item.id === id)
    if (!current || current.status === status) return
    const closing = (status === "closed" || status === "accepted") && (current.status === "open" || current.status === "in_progress")
    const reopening = (status === "open" || status === "in_progress") && (current.status === "closed" || current.status === "accepted")
    await updateDoc(doc(findingsCol(db, tenantId), id), { status, updatedAt: new Date().toISOString() })
    if (closing || reopening) {
      await bumpVendorOpenFindings(db, tenantId, current.vendorId, closing ? -1 : 1)
    }
    if (closing) {
      const vendor = vendorsRef.current.find((item) => item.id === current.vendorId)
      if (vendor) {
        const residual = clamp(vendor.residual - 6, 8, 99)
        const securityRating = clamp(vendor.securityRating + 2, 38, 99)
        await updateDoc(vendorRef(db, tenantId, vendor.id), {
          residual,
          securityRating,
          updatedAt: new Date().toISOString(),
        })
        await writeVendorValuation(db, tenantId, {
          vendorId: vendor.id,
          vendorName: vendor.name,
          inherent: vendor.inherent,
          residual,
          securityRating,
        })
      }
      await logActivity(db, tenantId, "finding", `${current.vendorName} finding ${status}`, current.title)
    }
  }, [tenantId])

  const markQuestionReviewed = useCallback(async (assessmentId: string, questionId: string) => {
    const db = requireDb()
    const assessment = assessmentsRef.current.find((item) => item.id === assessmentId)
    if (!assessment) return
    const questions = assessment.questions.map((question) =>
      question.id === questionId ? { ...question, reviewed: true } : question,
    )
    const done = questions.filter((question) => question.reviewed).length
    const progress = questions.length === 0 ? assessment.progress : Math.round((done / questions.length) * 100)
    await updateDoc(questionRef(db, tenantId, assessmentId, questionId), {
      reviewed: true,
      updatedAt: new Date().toISOString(),
    })
    await updateDoc(assessmentRef(db, tenantId, assessmentId), {
      progress,
      updatedAt: new Date().toISOString(),
    })
  }, [tenantId])

  const updateQuestionResponse = useCallback(async (
    assessmentId: string,
    questionId: string,
    input: { answer: string; evidence: string; evidenceUrl?: string; comment?: string },
  ) => {
    const db = requireDb()
    const assessment = assessmentsRef.current.find((item) => item.id === assessmentId)
    if (!assessment) return
    const questions = assessment.questions.map((question) =>
      question.id === questionId
        ? {
            ...question,
            answer: input.answer,
            evidence: input.evidence,
            evidenceUrl: input.evidenceUrl ?? question.evidenceUrl,
            comment: input.comment ?? question.comment,
            reviewed: false,
          }
        : question,
    )
    const filled = questions.filter((question) => question.answer.trim()).length
    const progress =
      questions.length === 0
        ? assessment.progress
        : Math.max(assessment.progress, Math.round((filled / questions.length) * 100))
    const filledAnswer = input.answer.trim().toLowerCase()
    const yesNo = filledAnswer === "yes" || filledAnswer === "no"
    const ai = yesNo
      ? filledAnswer === "yes"
        ? {
            verdict: "flag" as const,
            note: "Vendor attested yes. Confirm the control and attached evidence.",
            confidence: 72,
          }
        : {
            verdict: "gap" as const,
            note: "Vendor attested no. Treat as a control gap until an exception is signed.",
            confidence: 86,
          }
      : {
          verdict: input.answer.trim().length < 12 ? ("gap" as const) : ("flag" as const),
          note: input.answer.trim()
            ? "Vendor responded. Queue for InfoSec review."
            : "Awaiting vendor response.",
          confidence: input.answer.trim().length < 12 ? 62 : 74,
        }
    await updateDoc(
      questionRef(db, tenantId, assessmentId, questionId),
      omitUndefined({
        answer: input.answer,
        evidence: input.evidence,
        evidenceUrl: input.evidenceUrl,
        comment: input.comment ?? "",
        reviewed: false,
        ai,
        updatedAt: new Date().toISOString(),
      }),
    )
    const flagCount = questions.filter((question) => {
      const verdict = question.id === questionId ? ai.verdict : question.ai.verdict
      return verdict !== "ok"
    }).length
    await updateDoc(assessmentRef(db, tenantId, assessmentId), {
      progress,
      flagCount,
      updatedAt: new Date().toISOString(),
    })
    await logActivity(db, tenantId, "assessment", "Vendor updated a questionnaire answer", `${assessment.template} · ${questionId}`)
  }, [tenantId])

  const respondToFinding = useCallback(async (id: string, note: string) => {
    const db = requireDb()
    const current = findingsRef.current.find((item) => item.id === id)
    if (!current) return
    const status = current.status === "open" ? "in_progress" : current.status
    await updateDoc(doc(findingsCol(db, tenantId), id), {
      vendorNote: note,
      status,
      updatedAt: new Date().toISOString(),
    })
    await logActivity(db, tenantId, "finding", `${current.vendorName} vendor response`, note)
  }, [tenantId])

  const addVendorEvidence = useCallback(async (vendorId: string, cert: Certification) => {
    const db = requireDb()
    const vendor = vendorsRef.current.find((item) => item.id === vendorId)
    if (!vendor) return
    await updateDoc(vendorRef(db, tenantId, vendorId), {
      certifications: [cert, ...vendor.certifications],
      updatedAt: new Date().toISOString(),
    })
    await logActivity(db, tenantId, "intake", "Evidence uploaded from vendor portal", `${vendorId} · ${cert.name}`)
  }, [tenantId])

  const assignQuestionnaire = useCallback(async (vendorId: string, questionnaireId: string) => {
    const db = requireDb()
    const vendor = vendorsRef.current.find((item) => item.id === vendorId)
    if (!vendor) throw new Error("Vendor is not on the register.")
    const pack = questionnairesRef.current.find((item) => item.id === questionnaireId)
    if (!pack || pack.questions.length === 0) throw new Error("That questionnaire has no questions yet.")
    const open = assessmentsRef.current.find(
      (item) =>
        item.vendorId === vendorId &&
        item.questionnaireId === questionnaireId &&
        item.stage !== "monitoring",
    )
    if (open) throw new Error(`${pack.name} is already assigned to ${vendor.name}.`)
    const nowIso = new Date().toISOString()
    const assessmentId = `asm_${vendorId.replace(/^vnd_/, "")}_${questionnaireId.replace(/^tpl_/, "")}`
    const due = new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10)
    const owner = user?.name || vendor.owner
    await setDoc(assessmentRef(db, tenantId, assessmentId), {
      vendorId,
      vendorName: vendor.name,
      template: pack.name,
      questionnaireId,
      stage: "questionnaire",
      due,
      owner,
      progress: 0,
      questionCount: pack.questions.length,
      flagCount: pack.questions.length,
      updatedAt: nowIso,
    })
    await Promise.all(
      pack.questions.map((item) =>
        setDoc(questionRef(db, tenantId, assessmentId, item.id), {
          vendorId,
          assessmentId,
          domain: item.domain,
          prompt: item.prompt,
          kind: item.kind,
          rationale: item.rationale,
          answer: "",
          comment: "",
          evidence: "",
          ai: {
            verdict: "gap",
            note: "Awaiting vendor response.",
            confidence: 60,
          },
          reviewed: false,
          order: item.order,
          updatedAt: nowIso,
        }),
      ),
    )
    if (vendor.status === "intake") {
      await updateDoc(vendorRef(db, tenantId, vendorId), {
        status: "assessment",
        updatedAt: nowIso,
      }).catch(listenError("assign-status"))
    }
    await Promise.all([
      updateDoc(questionnaireRef(db, tenantId, questionnaireId), {
        usedBy: increment(1),
      }).catch(listenError("assign-usedBy")),
      bumpInFlightAssessments(db, tenantId, vendorId, 1).catch(listenError("assign-inflight")),
      logActivity(
        db,
        tenantId,
        "assessment",
        `${pack.name} assigned to ${vendor.name}`,
        `${pack.questions.length} questions · due ${due}`,
      ).catch(listenError("assign-activity")),
    ])
    return {
      assessment: {
        id: assessmentId,
        vendorId,
        vendorName: vendor.name,
        template: pack.name,
        questionnaireId,
        stage: "questionnaire" as const,
        due,
        owner,
        progress: 0,
        questions: pack.questions.map((item) => ({
          id: item.id,
          domain: item.domain,
          prompt: item.prompt,
          kind: item.kind,
          rationale: item.rationale,
          answer: "",
          comment: "",
          evidence: "",
          ai: { verdict: "gap" as const, note: "Awaiting vendor response.", confidence: 60 },
          reviewed: false,
        })),
      },
    }
  }, [tenantId, user])

  const advanceAssessment = useCallback(async (id: string) => {
    const db = requireDb()
    const assessment = assessmentsRef.current.find((item) => item.id === id)
    if (!assessment) return
    const idx = STAGES.indexOf(assessment.stage)
    const next = STAGES[Math.min(idx + 1, STAGES.length - 1)]!
    if (next === assessment.stage) return
    const progress = next === "monitoring" ? 100 : Math.min(100, assessment.progress + 12)
    await updateDoc(assessmentRef(db, tenantId, id), {
      stage: next,
      progress,
      updatedAt: new Date().toISOString(),
    })
    if (next === "monitoring") {
      await bumpInFlightAssessments(db, tenantId, assessment.vendorId, -1)
    }
    await logActivity(db, tenantId, "assessment", `${assessment.vendorName} → ${next}`, assessment.template)
  }, [tenantId])

  const addDirectoryUser = useCallback(async (input: {
    name: string
    email: string
    role: DirectoryUser["role"]
    vendorId?: string
    vendorName?: string
  }) => {
    const db = requireDb()
    const email = input.email.trim().toLowerCase()
    const name = input.name.trim()
    if (!email || !name) throw new Error("Name and email are required.")
    if (users.some((row) => row.email.toLowerCase() === email)) throw new Error("That email is already in the directory.")
    const titles: Record<DirectoryUser["role"], string> = {
      admin: "TPRM platform admin",
      infosec: "Vendor risk analyst",
      vendor: "Vendor contact",
    }
    let vendorId: string | undefined
    let vendorName: string | undefined
    if (input.role === "vendor") {
      const linked =
        scoredVendors.find((vendor) => vendor.id === input.vendorId) ??
        matchRegisterVendor(input.vendorName?.trim() || name, scoredVendors)
      if (!linked) {
        throw new Error("Pick a vendor that is already on the register.")
      }
      vendorId = linked.id
      vendorName = linked.name
    }
    const userId = `usr_${Date.now()}`
    await setDoc(
      doc(usersCol(db, tenantId), userId),
      omitUndefined({
        email,
        name,
        title: titles[input.role],
        role: input.role,
        vendorId,
        vendorName,
        active: true,
        createdAt: new Date().toISOString(),
      }),
    )
    await setDoc(
      emailRef(db, tenantId, email),
      omitUndefined({
        userId,
        email,
        name,
        title: titles[input.role],
        role: input.role,
        vendorId,
        vendorName,
        active: true,
      }),
    )
    await logActivity(db, tenantId, "access", `${name} added to the directory`, `${input.role} · ${email}`)
  }, [tenantId, users, scoredVendors])

  const savePolicies = useCallback(async (next: Policy) => {
    const db = requireDb()
    const payload = { ...next, updatedAt: new Date().toISOString() }
    await setDoc(policyRef(db, tenantId), payload, { merge: true })
  }, [tenantId])

  const value = useMemo(
    () => ({
      now,
      lastIngestAt,
      ready,
      loadError,
      vendors: scoredVendors,
      assessments,
      findings,
      signals,
      questionnaires,
      activities,
      users,
      policies,
      residualTrend,
      alertTrend,
      addVendorFromIntake,
      ackSignal,
      ackAllSignals,
      setFindingStatus,
      markQuestionReviewed,
      advanceAssessment,
      updateQuestionResponse,
      respondToFinding,
      addVendorEvidence,
      assignQuestionnaire,
      addDirectoryUser,
      savePolicies,
    }),
    [
      now,
      lastIngestAt,
      ready,
      loadError,
      scoredVendors,
      assessments,
      findings,
      signals,
      questionnaires,
      activities,
      users,
      policies,
      residualTrend,
      alertTrend,
      addVendorFromIntake,
      ackSignal,
      ackAllSignals,
      setFindingStatus,
      markQuestionReviewed,
      advanceAssessment,
      updateQuestionResponse,
      respondToFinding,
      addVendorEvidence,
      assignQuestionnaire,
      addDirectoryUser,
      savePolicies,
    ],
  )

  return <TprmContext.Provider value={value}>{children}</TprmContext.Provider>
}

export function useTprm() {
  const ctx = useContext(TprmContext)
  if (!ctx) throw new Error("useTprm must be used inside TprmProvider")
  return ctx
}
