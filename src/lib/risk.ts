import type { DataClass, IntakeDraft, RiskTier } from "@/types"

export function tierFromScore(score: number): RiskTier {
  if (score >= 75) return "critical"
  if (score >= 55) return "high"
  if (score >= 35) return "moderate"
  return "low"
}

export function scoreInherent(draft: IntakeDraft): {
  score: number
  dna: { data: number; access: number; criticality: number; geo: number; fourth: number }
} {
  const dataWeight: Record<DataClass, number> = {
    PCI: 28,
    PHI: 26,
    PII: 18,
    Confidential: 12,
    Internal: 6,
    Public: 2,
  }
  const data = Math.min(
    32,
    draft.dataClasses.reduce((sum, item) => sum + dataWeight[item], 0),
  )
  const access =
    (draft.prodAccess ? 18 : 4) + (draft.customerFacing ? 8 : 0)
  const criticality = draft.criticalProcess ? 22 : 8
  const geo = draft.geos.some((g) => ["IN", "PH", "CN", "BR"].includes(g))
    ? 12
    : 4
  const fourth = Math.min(16, draft.subprocessorCount * 3)
  const certGap = draft.hasSoc2 ? 0 : 10
  const score = Math.min(99, data + access + criticality + geo + fourth + certGap)
  return {
    score,
    dna: { data, access, criticality, geo, fourth },
  }
}
