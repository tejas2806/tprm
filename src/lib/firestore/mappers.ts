import { slaDeadlineIso, searchName, type PolicyDoc, type UserDoc, type VendorDoc } from "@/lib/firestore/schema"
import type {
  ActivityEvent,
  Assessment,
  DirectoryUser,
  Finding,
  Policy,
  QuestionBankItem,
  QuestionItem,
  Questionnaire,
  Signal,
  Vendor,
} from "@/types"

export function omitUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T
}

export const DEFAULT_POLICY: Policy = {
  criticalSlaDays: 3,
  highSlaDays: 7,
  watchtower: true,
  vendorPortal: true,
  aiOverlay: true,
  updatedAt: new Date().toISOString(),
}

export function mapVendor(id: string, data: Partial<VendorDoc>): Vendor {
  return {
    id,
    name: data.name ?? id,
    legalName: data.legalName ?? data.name ?? id,
    category: data.category ?? "",
    owner: data.owner ?? "",
    businessUnit: data.businessUnit ?? "",
    tier: data.tier ?? "moderate",
    status: data.status ?? "intake",
    inherent: data.inherent ?? 0,
    residual: data.residual ?? 0,
    inherentDna: data.inherentDna ?? { data: 0, access: 0, criticality: 0, geo: 0, fourth: 0 },
    dataClasses: data.dataClasses ?? [],
    hosting: data.hosting ?? "",
    geos: data.geos ?? [],
    subprocessors: data.subprocessors ?? [],
    certifications: data.certifications ?? [],
    contractEnd: data.contractEnd ?? "",
    lastAssessed: data.lastAssessed ?? "",
    nextReview: data.nextReview ?? "",
    securityRating: data.securityRating ?? 50,
    spend: data.spend ?? "",
    description: data.description ?? "",
    website: data.website ?? "",
    contacts: data.contacts ?? [],
    products: data.products ?? [],
    updatedAt: data.updatedAt,
  }
}

export function vendorToDoc(
  vendor: Vendor,
  counters?: { openFindingCount: number; openSignalCount: number; inFlightAssessmentCount: number },
): VendorDoc {
  const now = vendor.updatedAt ?? new Date().toISOString()
  return {
    name: vendor.name,
    legalName: vendor.legalName,
    category: vendor.category,
    owner: vendor.owner,
    businessUnit: vendor.businessUnit,
    tier: vendor.tier,
    status: vendor.status,
    inherent: vendor.inherent,
    residual: vendor.residual,
    inherentDna: vendor.inherentDna,
    dataClasses: vendor.dataClasses,
    hosting: vendor.hosting,
    geos: vendor.geos,
    subprocessors: vendor.subprocessors,
    certifications: vendor.certifications,
    contractEnd: vendor.contractEnd,
    lastAssessed: vendor.lastAssessed,
    nextReview: vendor.nextReview,
    securityRating: vendor.securityRating,
    spend: vendor.spend,
    description: vendor.description,
    website: vendor.website,
    contacts: vendor.contacts,
    products: vendor.products,
    searchName: searchName(vendor.name),
    openFindingCount: counters?.openFindingCount ?? 0,
    openSignalCount: counters?.openSignalCount ?? 0,
    inFlightAssessmentCount: counters?.inFlightAssessmentCount ?? 0,
    updatedAt: now,
  }
}

export function mapAssessment(
  id: string,
  data: {
    vendorId?: string
    vendorName?: string
    template?: string
    questionnaireId?: string
    stage?: Assessment["stage"]
    due?: string
    owner?: string
    progress?: number
  },
  questions: QuestionItem[] = [],
): Assessment {
  return {
    id,
    vendorId: data.vendorId ?? "",
    vendorName: data.vendorName ?? "",
    template: data.template ?? "",
    questionnaireId: data.questionnaireId,
    stage: data.stage ?? "intake",
    due: data.due ?? "",
    owner: data.owner ?? "",
    progress: data.progress ?? 0,
    questions,
  }
}

export function mapQuestion(id: string, data: Partial<QuestionItem>): QuestionItem {
  return {
    id,
    domain: data.domain ?? "",
    prompt: data.prompt ?? "",
    kind: data.kind,
    rationale: data.rationale,
    answer: data.answer ?? "",
    comment: data.comment,
    evidence: data.evidence ?? "",
    evidenceUrl: data.evidenceUrl,
    ai: data.ai ?? { verdict: "ok", note: "", confidence: 0 },
    reviewed: data.reviewed,
  }
}

export function mapFinding(id: string, data: Partial<Finding>): Finding {
  return {
    id,
    vendorId: data.vendorId ?? "",
    vendorName: data.vendorName ?? "",
    title: data.title ?? "",
    detail: data.detail ?? "",
    severity: data.severity ?? "moderate",
    status: data.status ?? "open",
    slaDays: data.slaDays ?? 7,
    owner: data.owner ?? "",
    control: data.control ?? "",
    opened: data.opened ?? new Date().toISOString().slice(0, 10),
    vendorNote: data.vendorNote,
  }
}

export function findingDeadline(finding: Finding) {
  return slaDeadlineIso(finding.opened, finding.slaDays)
}

export function mapSignal(id: string, data: Partial<Signal>): Signal {
  return {
    id,
    vendorId: data.vendorId ?? "",
    vendorName: data.vendorName ?? "",
    kind: data.kind ?? "news",
    severity: data.severity ?? "low",
    title: data.title ?? "",
    detail: data.detail ?? "",
    at: data.at ?? new Date().toISOString(),
    acked: Boolean(data.acked),
  }
}

export function mapActivity(id: string, data: Partial<ActivityEvent>): ActivityEvent {
  return {
    id,
    at: data.at ?? new Date().toISOString(),
    kind: data.kind ?? "signal",
    title: data.title ?? "",
    detail: data.detail ?? "",
  }
}

export function mapQuestionnaireItem(id: string, data: Partial<QuestionBankItem>): QuestionBankItem {
  return {
    id,
    domain: data.domain ?? "",
    prompt: data.prompt ?? "",
    kind: data.kind === "yes_no" ? "yes_no" : "text",
    rationale: data.rationale ?? "",
    order: Number(data.order ?? 0),
  }
}

export function mapQuestionnaire(id: string, data: Partial<Questionnaire>, questions: Questionnaire["questions"] = []): Questionnaire {
  return {
    id,
    name: data.name ?? id,
    version: data.version ?? "1.0",
    items: data.items ?? questions.length,
    usedBy: data.usedBy ?? 0,
    focus: data.focus ?? "",
    updated: data.updated ?? "",
    questions,
  }
}

export function mapUser(id: string, data: Partial<UserDoc>): DirectoryUser {
  return {
    id,
    email: data.email ?? "",
    name: data.name ?? "",
    title: data.title ?? "",
    role: data.role ?? "infosec",
    vendorId: data.vendorId,
    vendorName: data.vendorName,
    active: data.active !== false,
    createdAt: data.createdAt ?? "",
  }
}

export function mapPolicy(data?: Partial<PolicyDoc> | null): Policy {
  return {
    criticalSlaDays: data?.criticalSlaDays ?? DEFAULT_POLICY.criticalSlaDays,
    highSlaDays: data?.highSlaDays ?? DEFAULT_POLICY.highSlaDays,
    watchtower: data?.watchtower ?? DEFAULT_POLICY.watchtower,
    vendorPortal: data?.vendorPortal ?? DEFAULT_POLICY.vendorPortal,
    aiOverlay: data?.aiOverlay ?? DEFAULT_POLICY.aiOverlay,
    updatedAt: data?.updatedAt ?? DEFAULT_POLICY.updatedAt,
  }
}

export function dedupeUsers(users: DirectoryUser[]) {
  const byEmail = new Map<string, DirectoryUser>()
  for (const user of users) {
    const key = user.email.trim().toLowerCase()
    if (!key) continue
    const existing = byEmail.get(key)
    if (!existing) {
      byEmail.set(key, user)
      continue
    }
    const preferCurrent = user.id.length > 20 || user.createdAt > existing.createdAt
    if (preferCurrent) byEmail.set(key, user)
  }
  return [...byEmail.values()].sort((a, b) => a.name.localeCompare(b.name))
}
