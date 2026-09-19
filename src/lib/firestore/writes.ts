import { increment, setDoc, updateDoc, type Firestore } from "firebase/firestore"
import { kpiRef, valuationRef, vendorRef } from "@/lib/firestore/paths"

/** Fixed-size fan-out: bump vendor + KPI counters without scanning collections. */
export function bumpVendorOpenSignals(db: Firestore, tenantId: string, vendorId: string, delta: number) {
  return Promise.all([
    updateDoc(vendorRef(db, tenantId, vendorId), {
      openSignalCount: increment(delta),
      lastSignalAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    updateDoc(kpiRef(db, tenantId), {
      openAlerts: increment(delta),
      updatedAt: new Date().toISOString(),
    }),
  ])
}

export function bumpVendorOpenFindings(db: Firestore, tenantId: string, vendorId: string, delta: number) {
  return Promise.all([
    updateDoc(vendorRef(db, tenantId, vendorId), {
      openFindingCount: increment(delta),
      updatedAt: new Date().toISOString(),
    }),
    updateDoc(kpiRef(db, tenantId), {
      openFindings: increment(delta),
      updatedAt: new Date().toISOString(),
    }),
  ])
}

export function writeVendorValuation(
  db: Firestore,
  tenantId: string,
  input: {
    vendorId: string
    vendorName: string
    inherent: number
    residual: number
    securityRating: number
    residualHistory?: number[]
    ratingHistory?: number[]
  },
) {
  const now = new Date().toISOString()
  return setDoc(
    valuationRef(db, tenantId, input.vendorId),
    {
      vendorId: input.vendorId,
      vendorName: input.vendorName,
      inherent: input.inherent,
      residual: input.residual,
      securityRating: input.securityRating,
      residualHistory: input.residualHistory ?? [input.residual],
      ratingHistory: input.ratingHistory ?? [input.securityRating],
      updatedAt: now,
    },
    { merge: true },
  )
}

export function bumpInFlightAssessments(db: Firestore, tenantId: string, vendorId: string, delta: number) {
  return Promise.all([
    updateDoc(vendorRef(db, tenantId, vendorId), {
      inFlightAssessmentCount: increment(delta),
      updatedAt: new Date().toISOString(),
    }),
    updateDoc(kpiRef(db, tenantId), {
      inFlightAssessments: increment(delta),
      updatedAt: new Date().toISOString(),
    }),
  ])
}
