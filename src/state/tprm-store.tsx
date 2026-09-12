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
import { toast } from "sonner"
import {
  assessments as seedAssessments,
  findings as seedFindings,
  questionnaires,
  signals as seedSignals,
  vendors as seedVendors,
} from "@/data/seed"
import { liveEvents, progressTicks, ratingTicks } from "@/data/live-feed"
import { scoreInherent, tierFromScore } from "@/lib/risk"
import type {
  ActivityEvent,
  Assessment,
  Finding,
  FindingStatus,
  IntakeDraft,
  QuestionItem,
  Signal,
  Vendor,
} from "@/types"

const STORAGE_KEY = "aegis.demo.v3"

type Persisted = {
  vendors: Vendor[]
  assessments: Assessment[]
  findings: Finding[]
  signals: Signal[]
  activities: ActivityEvent[]
  residualTrend: number[]
  alertTrend: number[]
}

type TprmContextValue = {
  now: number
  lastIngestAt: number
  vendors: Vendor[]
  assessments: Assessment[]
  findings: Finding[]
  signals: Signal[]
  questionnaires: typeof questionnaires
  activities: ActivityEvent[]
  residualTrend: number[]
  alertTrend: number[]
  addVendorFromIntake: (draft: IntakeDraft) => { vendor: Vendor; assessment: Assessment }
  ackSignal: (id: string) => void
  ackAllSignals: () => void
  setFindingStatus: (id: string, status: FindingStatus) => void
  markQuestionReviewed: (assessmentId: string, questionId: string) => void
  advanceAssessment: (id: string) => void
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function loadPersisted(): Persisted | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Partial<Persisted>
    if (!Array.isArray(data.vendors) || !Array.isArray(data.residualTrend)) return null
    return data as Persisted
  } catch {
    return null
  }
}

function seedTrend(base: number, length: number) {
  let cursor = base + 6
  return Array.from({ length }, () => {
    cursor = clamp(cursor + (Math.random() * 3.2 - 1.8), base - 8, base + 10)
    return Math.round(cursor * 10) / 10
  })
}

function activity(
  kind: ActivityEvent["kind"],
  title: string,
  detail: string,
): ActivityEvent {
  return {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    kind,
    title,
    detail,
  }
}

function shiftIso(iso: string, ms: number) {
  return new Date(new Date(iso).getTime() + ms).toISOString()
}

function freshenClock<T extends { at: string }>(items: T[], now: number, gap = 22_000): T[] {
  return items.map((item, index) => ({
    ...item,
    at: new Date(now - (index * gap + 6_000)).toISOString(),
  }))
}

function rebasePersisted(data: Persisted): Persisted {
  const newest = data.signals[0]?.at ?? data.activities[0]?.at
  if (!newest) return data
  const age = Date.now() - new Date(newest).getTime()
  if (age < 40_000) return data
  const shift = age - 9_000
  return {
    ...data,
    signals: data.signals.map((item) => ({ ...item, at: shiftIso(item.at, shift) })),
    activities: data.activities.map((item) => ({ ...item, at: shiftIso(item.at, shift) })),
    vendors: data.vendors.map((vendor) =>
      vendor.updatedAt ? { ...vendor, updatedAt: shiftIso(vendor.updatedAt, shift) } : vendor,
    ),
  }
}

const TprmContext = createContext<TprmContextValue | null>(null)

export function TprmProvider({ children }: { children: ReactNode }) {
  const restored = useRef((() => {
    const data = loadPersisted()
    return data ? rebasePersisted(data) : null
  })())
  const liveIndex = useRef(0)
  const ratingIndex = useRef(0)
  const tickRef = useRef(0)
  const vendorsRef = useRef<Vendor[]>(seedVendors)
  const signalsRef = useRef<Signal[]>(seedSignals)
  const assessmentsRef = useRef<Assessment[]>(seedAssessments)
  const boot = useRef(Date.now())
  const avg0 = Math.round(
    seedVendors.reduce((sum, v) => sum + v.residual, 0) / seedVendors.length,
  )

  const [now, setNow] = useState(() => Date.now())
  const [lastIngestAt, setLastIngestAt] = useState(() => Date.now() - 4_000)
  const [vendors, setVendors] = useState<Vendor[]>(restored.current?.vendors ?? seedVendors)
  const [assessments, setAssessments] = useState<Assessment[]>(
    restored.current?.assessments ?? seedAssessments,
  )
  const [findings, setFindings] = useState<Finding[]>(restored.current?.findings ?? seedFindings)
  const [signals, setSignals] = useState<Signal[]>(
    restored.current?.signals ?? freshenClock(seedSignals, boot.current, 28_000),
  )
  const [activities, setActivities] = useState<ActivityEvent[]>(
    restored.current?.activities ??
      freshenClock(
        [
          activity("assessment", "HelixPay review opened", "SIG Core + PCI overlay in analyst queue"),
          activity("finding", "CVE-2026-4411 logged", "HelixPay edge nginx past patch SLA"),
          activity("signal", "PulseComms ISO lapsed", "Watchtower ingested certificate expiry"),
        ],
        boot.current,
        40_000,
      ),
  )
  const [residualTrend, setResidualTrend] = useState<number[]>(
    restored.current?.residualTrend ?? seedTrend(avg0, 14),
  )
  const [alertTrend, setAlertTrend] = useState<number[]>(
    restored.current?.alertTrend ?? seedTrend(5, 14).map((n) => Math.max(1, Math.round(n))),
  )

  vendorsRef.current = vendors
  signalsRef.current = signals
  assessmentsRef.current = assessments

  useEffect(() => {
    const payload: Persisted = {
      vendors,
      assessments,
      findings,
      signals,
      activities,
      residualTrend,
      alertTrend,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [vendors, assessments, findings, signals, activities, residualTrend, alertTrend])

  useEffect(() => {
    const ingestSignal = () => {
      const event = liveEvents[liveIndex.current % liveEvents.length]!
      liveIndex.current += 1
      const at = new Date().toISOString()
      const signal: Signal = {
        ...event,
        id: `sig_live_${Date.now()}`,
        at,
        acked: false,
      }
      const bump =
        event.severity === "critical" ? 4 : event.severity === "high" ? 2 : event.severity === "low" ? -1 : 1
      setSignals((prev) => {
        const next = [signal, ...prev].slice(0, 24)
        const open = next.filter((item) => !item.acked)
        if (open.length <= 8) return next
        const drop = [...open].reverse().find((item) => item.severity === "low" || item.severity === "moderate")
        return drop ? next.map((item) => (item.id === drop.id ? { ...item, acked: true } : item)) : next
      })
      setVendors((prev) =>
        prev.map((vendor) =>
          vendor.id === event.vendorId
            ? {
                ...vendor,
                securityRating: clamp(vendor.securityRating - bump, 38, 99),
                residual: clamp(vendor.residual + Math.max(0, bump), 8, 99),
                updatedAt: at,
              }
            : vendor,
        ),
      )
      if (event.severity === "critical") {
        setFindings((prev) => {
          if (prev.some((item) => item.vendorId === event.vendorId && item.title === event.title)) return prev
          const finding: Finding = {
            id: `fnd_live_${Date.now()}`,
            vendorId: event.vendorId,
            vendorName: event.vendorName,
            title: event.title,
            detail: event.detail,
            severity: event.severity,
            status: "open",
            slaDays: 3,
            owner: "Suyog Khairnar",
            control: "MON-01",
            opened: at.slice(0, 10),
          }
          return [finding, ...prev].slice(0, 16)
        })
      }
      setActivities((prev) =>
        [activity("signal", `${event.vendorName} · ${event.title}`, event.detail), ...prev].slice(0, 40),
      )
      setLastIngestAt(Date.now())
      if (event.severity === "critical" || event.severity === "high") {
        toast.warning(`${event.vendorName}: ${event.title}`, { duration: 4200 })
      }
    }

    const ingestRating = () => {
      const tick = ratingTicks[ratingIndex.current % ratingTicks.length]!
      ratingIndex.current += 1
      const at = new Date().toISOString()
      setVendors((prev) =>
        prev.map((vendor) =>
          vendor.id === tick.vendorId
            ? {
                ...vendor,
                securityRating: clamp(vendor.securityRating + tick.delta, 38, 99),
                residual: clamp(vendor.residual - tick.delta, 8, 99),
                updatedAt: at,
              }
            : vendor,
        ),
      )
      setActivities((prev) =>
        [
          activity(
            "rating",
            `${tick.vendorName} rating ${tick.delta > 0 ? "↑" : "↓"} ${Math.abs(tick.delta)}`,
            tick.detail,
          ),
          ...prev,
        ].slice(0, 40),
      )
      setLastIngestAt(Date.now())
    }

    const ingestProgress = () => {
      const open = assessmentsRef.current.filter((item) => item.stage !== "monitoring" && item.progress < 99)
      const target = open[liveIndex.current % Math.max(open.length, 1)]
      if (!target) return
      const hint = progressTicks.find((item) => item.stage === target.stage) ?? progressTicks[1]!
      const step = target.stage === "review" ? 2 : 3
      setAssessments((prev) =>
        prev.map((item) =>
          item.id === target.id
            ? { ...item, progress: clamp(item.progress + step, 0, 99) }
            : item,
        ),
      )
      setActivities((prev) =>
        [activity("assessment", `${target.vendorName} ${target.progress + step}%`, hint.note), ...prev].slice(
          0,
          40,
        ),
      )
      setLastIngestAt(Date.now())
    }

    const ingest = () => {
      if (document.hidden) return
      const lane = tickRef.current % 5
      tickRef.current += 1
      if (lane === 0 || lane === 2) ingestSignal()
      else if (lane === 4) ingestProgress()
      else ingestRating()
    }

    const clock = window.setInterval(() => setNow(Date.now()), 1000)
    const first = window.setTimeout(ingest, 1800)
    const feed = window.setInterval(ingest, 4000)
    const sample = window.setInterval(() => {
      if (document.hidden) return
      const avg =
        vendorsRef.current.reduce((sum, v) => sum + v.residual, 0) / vendorsRef.current.length
      setResidualTrend((series) => [...series.slice(-13), Math.round(avg * 10) / 10])
      const open = signalsRef.current.filter((s) => !s.acked).length
      setAlertTrend((series) => [...series.slice(-13), open])
    }, 5000)

    const onVisible = () => {
      if (!document.hidden) ingest()
    }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      window.clearInterval(clock)
      window.clearTimeout(first)
      window.clearInterval(feed)
      window.clearInterval(sample)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [])

  const addVendorFromIntake = useCallback((draft: IntakeDraft) => {
    const { score, dna } = scoreInherent(draft)
    const id = `vnd_${draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 12) || "new"}`
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
      lastAssessed: new Date().toISOString().slice(0, 10),
      nextReview: new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10),
      securityRating: 50,
      spend: "TBD",
      description: draft.description,
      website: `${draft.name.toLowerCase().replace(/\s+/g, "")}.example`,
      contacts: [],
      products: [draft.category],
      updatedAt: new Date().toISOString(),
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
    setVendors((prev) => [vendor, ...prev])
    setAssessments((prev) => [assessment, ...prev])
    setActivities((prev) =>
      [activity("intake", `${vendor.name} added to the register`, `Inherent ${score} · ${vendor.tier}`), ...prev].slice(
        0,
        40,
      ),
    )
    return { vendor, assessment }
  }, [])

  const ackSignal = useCallback((id: string) => {
    setSignals((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target && !target.acked) {
        setActivities((acts) =>
          [activity("ack", `Acknowledged ${target.vendorName}`, target.title), ...acts].slice(0, 40),
        )
      }
      return prev.map((item) => (item.id === id ? { ...item, acked: true } : item))
    })
  }, [])

  const ackAllSignals = useCallback(() => {
    setSignals((prev) => prev.map((item) => ({ ...item, acked: true })))
    setActivities((prev) =>
      [activity("ack", "Acknowledged all open signals", "Ticker cleared"), ...prev].slice(0, 40),
    )
  }, [])

  const setFindingStatus = useCallback((id: string, status: FindingStatus) => {
    setFindings((prev) => {
      const current = prev.find((item) => item.id === id)
      if (current && current.status !== status && (status === "closed" || status === "accepted")) {
        setVendors((list) =>
          list.map((vendor) =>
            vendor.id === current.vendorId
              ? {
                  ...vendor,
                  residual: clamp(vendor.residual - 6, 8, 99),
                  securityRating: clamp(vendor.securityRating + 2, 38, 99),
                  updatedAt: new Date().toISOString(),
                }
              : vendor,
          ),
        )
        setActivities((acts) =>
          [
            activity("finding", `${current.vendorName} finding ${status}`, current.title),
            ...acts,
          ].slice(0, 40),
        )
      }
      return prev.map((item) => (item.id === id ? { ...item, status } : item))
    })
  }, [])

  const markQuestionReviewed = useCallback((assessmentId: string, questionId: string) => {
    setAssessments((prev) =>
      prev.map((assessment) => {
        if (assessment.id !== assessmentId) return assessment
        const questions: QuestionItem[] = assessment.questions.map((question) =>
          question.id === questionId ? { ...question, reviewed: true } : question,
        )
        const done = questions.filter((q) => q.reviewed).length
        const progress =
          questions.length === 0 ? assessment.progress : Math.round((done / questions.length) * 100)
        return { ...assessment, questions, progress }
      }),
    )
  }, [])

  const advanceAssessment = useCallback((id: string) => {
    const order = ["intake", "scoping", "questionnaire", "review", "decision", "monitoring"] as const
    setAssessments((prev) =>
      prev.map((assessment) => {
        if (assessment.id !== id) return assessment
        const idx = order.indexOf(assessment.stage)
        const next = order[Math.min(idx + 1, order.length - 1)]!
        if (next !== assessment.stage) {
          setActivities((acts) =>
            [
              activity("assessment", `${assessment.vendorName} → ${next}`, assessment.template),
              ...acts,
            ].slice(0, 40),
          )
        }
        return {
          ...assessment,
          stage: next,
          progress: next === "monitoring" ? 100 : Math.min(100, assessment.progress + 12),
        }
      }),
    )
  }, [])

  const value = useMemo(
    () => ({
      now,
      lastIngestAt,
      vendors,
      assessments,
      findings,
      signals,
      questionnaires,
      activities,
      residualTrend,
      alertTrend,
      addVendorFromIntake,
      ackSignal,
      ackAllSignals,
      setFindingStatus,
      markQuestionReviewed,
      advanceAssessment,
    }),
    [
      now,
      lastIngestAt,
      vendors,
      assessments,
      findings,
      signals,
      activities,
      residualTrend,
      alertTrend,
      addVendorFromIntake,
      ackSignal,
      ackAllSignals,
      setFindingStatus,
      markQuestionReviewed,
      advanceAssessment,
    ],
  )

  return <TprmContext.Provider value={value}>{children}</TprmContext.Provider>
}

export function useTprm() {
  const ctx = useContext(TprmContext)
  if (!ctx) throw new Error("useTprm must be used inside TprmProvider")
  return ctx
}
