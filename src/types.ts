export type RiskTier = "critical" | "high" | "moderate" | "low"
export type VendorStatus =
  | "intake"
  | "assessment"
  | "remediation"
  | "monitoring"
  | "approved"
  | "offboarding"
export type DataClass = "PCI" | "PII" | "PHI" | "Confidential" | "Internal" | "Public"
export type AssessmentStage =
  | "intake"
  | "scoping"
  | "questionnaire"
  | "review"
  | "decision"
  | "monitoring"
export type FindingStatus = "open" | "in_progress" | "accepted" | "closed"
export type SignalKind = "breach" | "cve" | "cert" | "rating" | "news" | "expiry" | "ai"
export type AiVerdict = "ok" | "flag" | "gap"
export type ActivityKind = "signal" | "finding" | "assessment" | "intake" | "ack" | "rating"

export type ActivityEvent = {
  id: string
  at: string
  kind: ActivityKind
  title: string
  detail: string
}

export type InherentDna = {
  data: number
  access: number
  criticality: number
  geo: number
  fourth: number
}

export type Certification = {
  name: string
  expires: string
  status: "valid" | "expiring" | "expired"
}

export type VendorContact = {
  name: string
  role: string
  email: string
}

export type Vendor = {
  id: string
  name: string
  legalName: string
  category: string
  owner: string
  businessUnit: string
  tier: RiskTier
  status: VendorStatus
  inherent: number
  residual: number
  inherentDna: InherentDna
  dataClasses: DataClass[]
  hosting: string
  geos: string[]
  subprocessors: string[]
  certifications: Certification[]
  contractEnd: string
  lastAssessed: string
  nextReview: string
  securityRating: number
  spend: string
  description: string
  website: string
  contacts: VendorContact[]
  products: string[]
  updatedAt?: string
}

export type QuestionItem = {
  id: string
  domain: string
  prompt: string
  answer: string
  evidence: string
  ai: { verdict: AiVerdict; note: string; confidence: number }
  reviewed?: boolean
}

export type Assessment = {
  id: string
  vendorId: string
  vendorName: string
  template: string
  stage: AssessmentStage
  due: string
  owner: string
  progress: number
  questions: QuestionItem[]
}

export type Finding = {
  id: string
  vendorId: string
  vendorName: string
  title: string
  detail: string
  severity: RiskTier
  status: FindingStatus
  slaDays: number
  owner: string
  control: string
  opened: string
}

export type Signal = {
  id: string
  vendorId: string
  vendorName: string
  kind: SignalKind
  severity: RiskTier
  title: string
  detail: string
  at: string
  acked: boolean
}

export type Questionnaire = {
  id: string
  name: string
  version: string
  items: number
  usedBy: number
  focus: string
  updated: string
}

export type IntakeDraft = {
  name: string
  category: string
  businessUnit: string
  owner: string
  description: string
  dataClasses: DataClass[]
  prodAccess: boolean
  customerFacing: boolean
  criticalProcess: boolean
  hosting: string
  geos: string[]
  subprocessorCount: number
  hasSoc2: boolean
}
