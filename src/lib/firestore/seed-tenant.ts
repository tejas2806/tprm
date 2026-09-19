import { doc, getDocs, limit, query, writeBatch, type Firestore } from "firebase/firestore"
import { demoAccounts } from "@/data/accounts"
import { questionnaireBank } from "@/data/questionnaire-bank"
import {
  assessments as seedAssessments,
  findings as seedFindings,
  signals as seedSignals,
  vendors as seedVendors,
} from "@/data/seed"
import { findingDeadline, vendorToDoc } from "@/lib/firestore/mappers"
import {
  activitiesCol,
  assessmentRef,
  concentrationRef,
  findingsCol,
  kpiRef,
  policyRef,
  questionRef,
  questionnaireItemRef,
  questionnaireItemsCol,
  questionnairesCol,
  signalsCol,
  emailRef,
  tenantRef,
  usersCol,
  valuationRef,
  vendorRef,
  vendorsCol,
} from "@/lib/firestore/paths"
import type { KpiDoc, TenantDoc, ValuationDoc } from "@/lib/firestore/schema"
import type { Finding, Signal, Vendor } from "@/types"

const SEED_ACTIVITIES = [
  { title: "HelixPay review opened", detail: "SIG Core + PCI overlay in analyst queue", kind: "assessment" as const },
  { title: "CVE-2026-4411 logged", detail: "HelixPay edge nginx past patch SLA", kind: "finding" as const },
  { title: "PulseComms ISO lapsed", detail: "Watchtower ingested certificate expiry", kind: "signal" as const },
]

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function seedTrend(base: number, length: number) {
  let cursor = base + 6
  return Array.from({ length }, () => {
    cursor = clamp(cursor + (Math.random() * 3.2 - 1.8), base - 8, base + 10)
    return Math.round(cursor * 10) / 10
  })
}

function openFinding(item: Finding) {
  return item.status === "open" || item.status === "in_progress"
}

function vendorCounters(vendorId: string) {
  return {
    openFindingCount: seedFindings.filter((item) => item.vendorId === vendorId && openFinding(item)).length,
    openSignalCount: seedSignals.filter((item) => item.vendorId === vendorId && !item.acked).length,
    inFlightAssessmentCount: seedAssessments.filter(
      (item) => item.vendorId === vendorId && item.stage !== "monitoring",
    ).length,
  }
}

function valuationFor(vendor: Vendor): ValuationDoc {
  const now = new Date().toISOString()
  return {
    vendorId: vendor.id,
    vendorName: vendor.name,
    inherent: vendor.inherent,
    residual: vendor.residual,
    securityRating: vendor.securityRating,
    residualHistory: seedTrend(vendor.residual, 8),
    ratingHistory: seedTrend(vendor.securityRating, 8),
    updatedAt: now,
  }
}

function buildKpis(): KpiDoc {
  const now = new Date().toISOString()
  const avgResidual = Math.round(
    seedVendors.reduce((sum, vendor) => sum + vendor.residual, 0) / seedVendors.length,
  )
  const avgRating = Math.round(
    seedVendors.reduce((sum, vendor) => sum + vendor.securityRating, 0) / seedVendors.length,
  )
  const openAlerts = seedSignals.filter((item) => !item.acked).length
  return {
    vendorCount: seedVendors.length,
    materialCount: seedVendors.filter((vendor) => vendor.tier === "critical" || vendor.tier === "high").length,
    openAlerts,
    openFindings: seedFindings.filter(openFinding).length,
    slaAtRisk: seedFindings.filter((item) => openFinding(item) && item.slaDays <= 5).length,
    inFlightAssessments: seedAssessments.filter((item) => item.stage !== "monitoring").length,
    avgResidual,
    avgRating,
    residualTrend: seedTrend(avgResidual, 14),
    alertTrend: seedTrend(openAlerts, 14).map((n) => Math.max(1, Math.round(n))),
    updatedAt: now,
  }
}

function writeQuestionBank(batch: ReturnType<typeof writeBatch>, db: Firestore, tenantId: string, preserveUsedBy: boolean) {
  for (const questionnaire of questionnaireBank) {
    batch.set(
      doc(questionnairesCol(db, tenantId), questionnaire.id),
      {
        name: questionnaire.name,
        version: questionnaire.version,
        items: questionnaire.questions.length,
        focus: questionnaire.focus,
        updated: questionnaire.updated,
        ...(preserveUsedBy ? {} : { usedBy: questionnaire.usedBy }),
      },
      { merge: true },
    )
    for (const item of questionnaire.questions) {
      batch.set(
        questionnaireItemRef(db, tenantId, questionnaire.id, item.id),
        {
          domain: item.domain,
          prompt: item.prompt,
          kind: item.kind,
          rationale: item.rationale,
          order: item.order,
        },
        { merge: true },
      )
    }
  }
}

function concentrationMap() {
  const fourthParties: Record<string, number> = {}
  for (const vendor of seedVendors) {
    for (const party of vendor.subprocessors) {
      fourthParties[party] = (fourthParties[party] ?? 0) + 1
    }
  }
  return fourthParties
}

async function writeSeed(db: Firestore, tenantId: string) {
  const now = new Date().toISOString()
  const batch = writeBatch(db)

  const tenant: TenantDoc = {
    name: "Northline Bank",
    slug: tenantId,
    fiscalPeriod: "FY26",
    createdAt: now,
    seeded: true,
  }
  batch.set(tenantRef(db, tenantId), tenant)

  for (const account of demoAccounts) {
    batch.set(doc(usersCol(db, tenantId), account.id), {
      email: account.email,
      name: account.name,
      title: account.title,
      role: account.role,
      ...(account.vendorId ? { vendorId: account.vendorId, vendorName: account.vendorName } : {}),
      active: true,
      createdAt: now,
    })
    batch.set(emailRef(db, tenantId, account.email), {
      userId: account.id,
      email: account.email,
      name: account.name,
      title: account.title,
      role: account.role,
      ...(account.vendorId ? { vendorId: account.vendorId, vendorName: account.vendorName } : {}),
      active: true,
    })
  }

  for (const vendor of seedVendors) {
    batch.set(vendorRef(db, tenantId, vendor.id), vendorToDoc({ ...vendor, updatedAt: now }, vendorCounters(vendor.id)))
    batch.set(valuationRef(db, tenantId, vendor.id), valuationFor(vendor))
  }

  for (const assessment of seedAssessments) {
    batch.set(assessmentRef(db, tenantId, assessment.id), {
      vendorId: assessment.vendorId,
      vendorName: assessment.vendorName,
      template: assessment.template,
      ...(assessment.questionnaireId ? { questionnaireId: assessment.questionnaireId } : {}),
      stage: assessment.stage,
      due: assessment.due,
      owner: assessment.owner,
      progress: assessment.progress,
      questionCount: assessment.questions.length,
      flagCount: assessment.questions.filter((item) => item.ai.verdict !== "ok").length,
      updatedAt: now,
    })
    assessment.questions.forEach((question, order) => {
      batch.set(questionRef(db, tenantId, assessment.id, question.id), {
        vendorId: assessment.vendorId,
        assessmentId: assessment.id,
        domain: question.domain,
        prompt: question.prompt,
        answer: question.answer,
        evidence: question.evidence,
        ai: question.ai,
        reviewed: Boolean(question.reviewed),
        order,
        updatedAt: now,
      })
    })
  }

  for (const finding of seedFindings) {
    batch.set(doc(findingsCol(db, tenantId), finding.id), {
      ...finding,
      slaDeadline: findingDeadline(finding),
      updatedAt: now,
    })
  }

  seedSignals.forEach((signal: Signal, index) => {
    batch.set(doc(signalsCol(db, tenantId), signal.id), {
      ...signal,
      at: new Date(Date.now() - (index * 28_000 + 6_000)).toISOString(),
    })
  })

  SEED_ACTIVITIES.forEach((item, index) => {
    batch.set(doc(activitiesCol(db, tenantId), `act_seed_${index}`), {
      at: new Date(Date.now() - (index * 40_000 + 8_000)).toISOString(),
      kind: item.kind,
      title: item.title,
      detail: item.detail,
    })
  })

  writeQuestionBank(batch, db, tenantId, false)

  batch.set(kpiRef(db, tenantId), buildKpis())
  batch.set(concentrationRef(db, tenantId), {
    fourthParties: concentrationMap(),
    updatedAt: now,
  })
  batch.set(policyRef(db, tenantId), {
    criticalSlaDays: 3,
    highSlaDays: 7,
    watchtower: true,
    vendorPortal: true,
    aiOverlay: true,
    updatedAt: now,
  })

  await batch.commit()
}

let seedLock: Promise<void> | null = null

export function ensureTenantSeeded(db: Firestore, tenantId: string) {
  seedLock ??= (async () => {
    try {
      const vendorsSnap = await getDocs(query(vendorsCol(db, tenantId), limit(20)))
      if (vendorsSnap.size >= 12) {
        await ensureQuestionBank(db, tenantId)
        return
      }
    } catch {
      // Empty or unreadable register — write the Northline seed.
    }
    await writeSeed(db, tenantId)
  })().catch((error) => {
    seedLock = null
    throw error
  })
  return seedLock
}

let bankLock: Promise<void> | null = null

export function ensureQuestionBank(db: Firestore, tenantId: string) {
  bankLock ??= (async () => {
    const first = questionnaireBank[0]
    if (!first) return
    const items = await getDocs(query(questionnaireItemsCol(db, tenantId, first.id), limit(1))).catch(() => null)
    const needsWrite = !items || items.empty || !items.docs[0]?.data()?.kind
    if (!needsWrite) return
    const batch = writeBatch(db)
    writeQuestionBank(batch, db, tenantId, Boolean(items && !items.empty))
    await batch.commit()
  })().catch((error) => {
    bankLock = null
    throw error
  })
  return bankLock
}
