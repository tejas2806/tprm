import { collection, doc, type Firestore } from "firebase/firestore"
import { TENANT_COLLECTION } from "@/lib/firestore/schema"

export function tenantRef(db: Firestore, tenantId: string) {
  return doc(db, TENANT_COLLECTION, tenantId)
}

export function usersCol(db: Firestore, tenantId: string) {
  return collection(db, TENANT_COLLECTION, tenantId, "users")
}

export function emailRef(db: Firestore, tenantId: string, email: string) {
  return doc(db, TENANT_COLLECTION, tenantId, "emails", email.trim().toLowerCase())
}

export function vendorsCol(db: Firestore, tenantId: string) {
  return collection(db, TENANT_COLLECTION, tenantId, "vendors")
}

export function vendorRef(db: Firestore, tenantId: string, vendorId: string) {
  return doc(db, TENANT_COLLECTION, tenantId, "vendors", vendorId)
}

export function assessmentsCol(db: Firestore, tenantId: string) {
  return collection(db, TENANT_COLLECTION, tenantId, "assessments")
}

export function assessmentRef(db: Firestore, tenantId: string, assessmentId: string) {
  return doc(db, TENANT_COLLECTION, tenantId, "assessments", assessmentId)
}

export function questionsCol(db: Firestore, tenantId: string, assessmentId: string) {
  return collection(db, TENANT_COLLECTION, tenantId, "assessments", assessmentId, "questions")
}

export function questionRef(db: Firestore, tenantId: string, assessmentId: string, questionId: string) {
  return doc(db, TENANT_COLLECTION, tenantId, "assessments", assessmentId, "questions", questionId)
}

export function findingsCol(db: Firestore, tenantId: string) {
  return collection(db, TENANT_COLLECTION, tenantId, "findings")
}

export function signalsCol(db: Firestore, tenantId: string) {
  return collection(db, TENANT_COLLECTION, tenantId, "signals")
}

export function activitiesCol(db: Firestore, tenantId: string) {
  return collection(db, TENANT_COLLECTION, tenantId, "activities")
}

export function questionnairesCol(db: Firestore, tenantId: string) {
  return collection(db, TENANT_COLLECTION, tenantId, "questionnaires")
}

export function questionnaireRef(db: Firestore, tenantId: string, questionnaireId: string) {
  return doc(db, TENANT_COLLECTION, tenantId, "questionnaires", questionnaireId)
}

export function questionnaireItemsCol(db: Firestore, tenantId: string, questionnaireId: string) {
  return collection(db, TENANT_COLLECTION, tenantId, "questionnaires", questionnaireId, "items")
}

export function questionnaireItemRef(
  db: Firestore,
  tenantId: string,
  questionnaireId: string,
  itemId: string,
) {
  return doc(db, TENANT_COLLECTION, tenantId, "questionnaires", questionnaireId, "items", itemId)
}

export function kpiRef(db: Firestore, tenantId: string) {
  return doc(db, TENANT_COLLECTION, tenantId, "metrics", "kpis")
}

export function concentrationRef(db: Firestore, tenantId: string) {
  return doc(db, TENANT_COLLECTION, tenantId, "metrics", "concentration")
}

export function policyRef(db: Firestore, tenantId: string) {
  return doc(db, TENANT_COLLECTION, tenantId, "policies", "default")
}

export function valuationsCol(db: Firestore, tenantId: string) {
  return collection(db, TENANT_COLLECTION, tenantId, "valuations")
}

export function valuationRef(db: Firestore, tenantId: string, vendorId: string) {
  return doc(db, TENANT_COLLECTION, tenantId, "valuations", vendorId)
}

export function evidenceFileRef(db: Firestore, tenantId: string, fileId: string) {
  return doc(db, TENANT_COLLECTION, tenantId, "evidenceFiles", fileId)
}

export function evidenceChunksCol(db: Firestore, tenantId: string, fileId: string) {
  return collection(db, TENANT_COLLECTION, tenantId, "evidenceFiles", fileId, "chunks")
}

export function evidenceChunkRef(db: Firestore, tenantId: string, fileId: string, chunkId: string) {
  return doc(db, TENANT_COLLECTION, tenantId, "evidenceFiles", fileId, "chunks", chunkId)
}
