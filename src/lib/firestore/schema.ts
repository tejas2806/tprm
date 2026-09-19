import type {
  ActivityKind,
  AiVerdict,
  AssessmentStage,
  DataClass,
  FindingStatus,
  QuestionKind,
  RiskTier,
  SignalKind,
  UserRole,
  VendorStatus,
} from "@/types"

/**
 * Firestore layout (tenant-scoped). Reads stay O(n) in the documents you
 * actually need — never O(vendors × findings) client joins.
 *
 *   tenants/{tenantId}
 *     users/{uid}
 *     vendors/{vendorId}
 *     assessments/{assessmentId}
 *       questions/{questionId}     // not embedded: list views stay O(assessments)
 *     findings/{findingId}
 *     signals/{signalId}
 *     activities/{activityId}
 *     questionnaires/{id}
 *       items/{itemId}             // default question bank (not answers)
 *     assessments/{assessmentId}
 *       questions/{questionId}     // assigned copy + vendor responses
 *     valuations/{vendorId}        // residual/rating history, 1 doc per vendor
 *     metrics/kpis                 // O(1) dashboard
 *     metrics/concentration        // O(1) fourth-party page
 *     evidenceFiles/{fileId}           // vendor document uploads
 *       chunks/{chunkId}
 *
 * Why this is ~O(n)
 * - Every child carries tenantId + vendorId so filters are equality indexes.
 * - KPI / concentration are denormalized on write (1 doc read, not a scan).
 * - Questions live in a subcollection so the pipeline kanban does not load answers.
 * - slaDeadline is a stored timestamp so open-finding sort is an index walk.
 * - vendorName is copied onto children — no N+1 vendor lookups.
 * - Counters on the vendor doc (openFindings, openSignals) avoid counting.
 *
 * Writes fan out to a fixed handful of docs (item + vendor counters + kpis +
 * activity). That is O(1) per event, not O(n).
 */

export const TENANT_COLLECTION = "tenants"
export const DEFAULT_TENANT_ID = "northline"

export type TenantDoc = {
  name: string
  slug: string
  fiscalPeriod: string
  createdAt: string
  seeded?: boolean
}

export type EmailDoc = {
  userId: string
  email: string
  name: string
  title: string
  role: UserRole
  vendorId?: string
  vendorName?: string
  active: boolean
}

export type UserDoc = {
  email: string
  name: string
  title: string
  role: UserRole
  vendorId?: string
  vendorName?: string
  active: boolean
  createdAt: string
}

export type VendorDoc = {
  name: string
  legalName: string
  category: string
  owner: string
  ownerId?: string
  businessUnit: string
  tier: RiskTier
  status: VendorStatus
  inherent: number
  residual: number
  inherentDna: {
    data: number
    access: number
    criticality: number
    geo: number
    fourth: number
  }
  dataClasses: DataClass[]
  hosting: string
  geos: string[]
  subprocessors: string[]
  certifications: { name: string; expires: string; status: "valid" | "expiring" | "expired" }[]
  contractEnd: string
  lastAssessed: string
  nextReview: string
  securityRating: number
  spend: string
  description: string
  website: string
  contacts: { name: string; role: string; email: string }[]
  products: string[]
  searchName: string
  openFindingCount: number
  openSignalCount: number
  inFlightAssessmentCount: number
  lastSignalAt?: string
  updatedAt: string
}

export type AssessmentDoc = {
  vendorId: string
  vendorName: string
  template: string
  questionnaireId?: string
  stage: AssessmentStage
  due: string
  owner: string
  ownerId?: string
  progress: number
  questionCount: number
  flagCount: number
  updatedAt: string
}

export type QuestionDoc = {
  vendorId: string
  assessmentId: string
  domain: string
  prompt: string
  kind?: QuestionKind
  rationale?: string
  answer: string
  comment?: string
  evidence: string
  evidenceUrl?: string
  ai: { verdict: AiVerdict; note: string; confidence: number }
  reviewed: boolean
  order: number
  updatedAt: string
}

export type FindingDoc = {
  vendorId: string
  vendorName: string
  title: string
  detail: string
  severity: RiskTier
  status: FindingStatus
  slaDays: number
  slaDeadline: string
  owner: string
  control: string
  opened: string
  vendorNote?: string
  updatedAt: string
}

export type SignalDoc = {
  vendorId: string
  vendorName: string
  kind: SignalKind
  severity: RiskTier
  title: string
  detail: string
  at: string
  acked: boolean
}

export type ActivityDoc = {
  at: string
  kind: ActivityKind
  title: string
  detail: string
}

export type QuestionnaireDoc = {
  name: string
  version: string
  items: number
  usedBy: number
  focus: string
  updated: string
}

export type QuestionnaireItemDoc = {
  domain: string
  prompt: string
  kind: QuestionKind
  rationale: string
  order: number
}

export type KpiDoc = {
  vendorCount: number
  materialCount: number
  openAlerts: number
  openFindings: number
  slaAtRisk: number
  inFlightAssessments: number
  avgResidual: number
  avgRating: number
  residualTrend: number[]
  alertTrend: number[]
  updatedAt: string
}

export type ConcentrationDoc = {
  fourthParties: Record<string, number>
  updatedAt: string
}

export type ValuationDoc = {
  vendorId: string
  vendorName: string
  inherent: number
  residual: number
  securityRating: number
  residualHistory: number[]
  ratingHistory: number[]
  updatedAt: string
}

export type PolicyDoc = {
  criticalSlaDays: number
  highSlaDays: number
  watchtower: boolean
  vendorPortal: boolean
  aiOverlay: boolean
  updatedAt: string
}

export function slaDeadlineIso(opened: string, slaDays: number) {
  return new Date(new Date(opened).getTime() + slaDays * 86_400_000).toISOString()
}

export function searchName(name: string) {
  return name.trim().toLowerCase()
}
