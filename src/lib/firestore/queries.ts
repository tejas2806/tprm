import {
  documentId,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type Firestore,
  type QueryConstraint,
} from "firebase/firestore"
import {
  activitiesCol,
  assessmentRef,
  assessmentsCol,
  findingsCol,
  kpiRef,
  questionsCol,
  signalsCol,
  usersCol,
  vendorRef,
  vendorsCol,
} from "@/lib/firestore/paths"
import type { AssessmentStage, FindingStatus, RiskTier, UserRole, VendorStatus } from "@/types"

const LIST = 80
const FEED = 40
const TICKER = 30

/** O(1) — one KPI document, not a scan of vendors/findings. */
export function loadKpis(db: Firestore, tenantId: string) {
  return getDoc(kpiRef(db, tenantId))
}

/** O(n) vendors returned. Filters run on indexes, not in the client. */
export function loadVendors(
  db: Firestore,
  tenantId: string,
  filters?: { tier?: RiskTier; status?: VendorStatus },
) {
  const constraints: QueryConstraint[] = []
  if (filters?.tier) constraints.push(where("tier", "==", filters.tier))
  if (filters?.status) constraints.push(where("status", "==", filters.status))
  constraints.push(orderBy("name"), limit(LIST))
  return getDocs(query(vendorsCol(db, tenantId), ...constraints))
}

/** O(1) vendor card. */
export function loadVendor(db: Firestore, tenantId: string, vendorId: string) {
  return getDoc(vendorRef(db, tenantId, vendorId))
}

/** O(n) assessments — questions stay in the subcollection. */
export function loadAssessments(
  db: Firestore,
  tenantId: string,
  filters?: { vendorId?: string; stage?: AssessmentStage },
) {
  const constraints: QueryConstraint[] = []
  if (filters?.vendorId) constraints.push(where("vendorId", "==", filters.vendorId))
  if (filters?.stage) constraints.push(where("stage", "==", filters.stage))
  constraints.push(orderBy("due"), limit(LIST))
  return getDocs(query(assessmentsCol(db, tenantId), ...constraints))
}

/** O(n) questions for one workspace. */
export function loadQuestions(db: Firestore, tenantId: string, assessmentId: string) {
  return getDocs(query(questionsCol(db, tenantId, assessmentId), orderBy("order")))
}

export function loadAssessment(db: Firestore, tenantId: string, assessmentId: string) {
  return getDoc(assessmentRef(db, tenantId, assessmentId))
}

/** O(n) findings. Vendor portal passes vendorId so n is that vendor only. */
export function loadFindings(
  db: Firestore,
  tenantId: string,
  filters?: { vendorId?: string; status?: FindingStatus },
) {
  const constraints: QueryConstraint[] = []
  if (filters?.vendorId) constraints.push(where("vendorId", "==", filters.vendorId))
  if (filters?.status) constraints.push(where("status", "==", filters.status))
  constraints.push(orderBy("slaDeadline"), limit(LIST))
  return getDocs(query(findingsCol(db, tenantId), ...constraints))
}

export function loadOpenFindings(db: Firestore, tenantId: string, vendorId?: string) {
  const constraints: QueryConstraint[] = [
    where("status", "in", ["open", "in_progress"]),
  ]
  if (vendorId) constraints.push(where("vendorId", "==", vendorId))
  constraints.push(orderBy("slaDeadline"), limit(LIST))
  return getDocs(query(findingsCol(db, tenantId), ...constraints))
}

/** O(n) live ticker — only unacked rows. */
export function loadLiveSignals(db: Firestore, tenantId: string, vendorId?: string) {
  const constraints: QueryConstraint[] = [where("acked", "==", false)]
  if (vendorId) constraints.push(where("vendorId", "==", vendorId))
  constraints.push(orderBy("at", "desc"), limit(TICKER))
  return getDocs(query(signalsCol(db, tenantId), ...constraints))
}

export function loadSignals(db: Firestore, tenantId: string, vendorId?: string) {
  const constraints: QueryConstraint[] = []
  if (vendorId) constraints.push(where("vendorId", "==", vendorId))
  constraints.push(orderBy("at", "desc"), limit(LIST))
  return getDocs(query(signalsCol(db, tenantId), ...constraints))
}

/** O(n) activity window. */
export function loadActivities(db: Firestore, tenantId: string) {
  return getDocs(query(activitiesCol(db, tenantId), orderBy("at", "desc"), limit(FEED)))
}

export function loadUsers(db: Firestore, tenantId: string, role?: UserRole) {
  const constraints: QueryConstraint[] = []
  if (role) constraints.push(where("role", "==", role))
  constraints.push(orderBy("name"), limit(LIST))
  return getDocs(query(usersCol(db, tenantId), ...constraints))
}

export function loadUserByEmail(db: Firestore, tenantId: string, email: string) {
  return getDocs(
    query(usersCol(db, tenantId), where("email", "==", email.trim().toLowerCase()), limit(1)),
  )
}

/** Dossier: 1 vendor + 3 indexed lists. Still O(n) in that vendor's rows. */
export async function loadVendorDossier(db: Firestore, tenantId: string, vendorId: string) {
  const [vendor, assessments, findings, signals] = await Promise.all([
    loadVendor(db, tenantId, vendorId),
    loadAssessments(db, tenantId, { vendorId }),
    loadFindings(db, tenantId, { vendorId }),
    loadSignals(db, tenantId, vendorId),
  ])
  return { vendor, assessments, findings, signals }
}

export function loadVendorsByIds(db: Firestore, tenantId: string, ids: string[]) {
  if (ids.length === 0) return Promise.resolve(null)
  return getDocs(query(vendorsCol(db, tenantId), where(documentId(), "in", ids.slice(0, 10))))
}
