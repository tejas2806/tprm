import type { QuestionBankItem, QuestionKind, Questionnaire } from "@/types"

export type QuestionnairePack = Questionnaire & { questions: QuestionBankItem[] }

function pack(
  id: string,
  name: string,
  version: string,
  focus: string,
  updated: string,
  usedBy: number,
  questions: Omit<QuestionBankItem, "id" | "order">[],
): QuestionnairePack {
  return {
    id,
    name,
    version,
    focus,
    updated,
    usedBy,
    items: questions.length,
    questions: questions.map((question, order) => ({
      id: `${id}_${order + 1}`,
      ...question,
      order,
    })),
  }
}

export const questionnaireBank: QuestionnairePack[] = [
  pack("tpl_sig", "SIG Core", "2024.1", "Full due diligence", "2026-04-02", 9, [
    {
      domain: "Encryption",
      kind: "yes_no",
      prompt: "Is customer and cardholder data encrypted at rest with AES-256 or equivalent?",
      rationale:
        "Unencrypted data at rest is a reportable PCI / confidentiality failure. We need this control (and usually a SOC 2 CC6.1 or PCI ROC extract) to prove keys are not sitting next to the data.",
    },
    {
      domain: "Access",
      kind: "yes_no",
      prompt: "Are production break-glass accounts unique, vaulted, and reviewed at least monthly?",
      rationale:
        "Shared root or unrehearsed break-glass is how incidents become breaches. Monthly review evidence shows the vault is actually used, not just documented.",
    },
    {
      domain: "Vulnerability",
      kind: "text",
      prompt: "What is your SLA to patch critical internet-facing CVEs, and is any in-scope host currently past that SLA?",
      rationale:
        "Northline residual stays high while a critical CVE is past the vendor’s own SLA. The answer sets Watchtower’s clock; a vuln export or scanner screenshot is the proof.",
    },
    {
      domain: "Subprocessors",
      kind: "text",
      prompt: "List subprocessors with access to Northline confidential data, CHD, or PAN.",
      rationale:
        "Fourth parties inherit our data without a Northline contract. We need the live register to map concentration and to know who must be in the DPA.",
    },
    {
      domain: "Resilience",
      kind: "text",
      prompt: "State RTO and RPO for the in-scope service, and the date of the last failover test.",
      rationale:
        "If this service sits on a customer-facing rail, an untested RTO longer than Northline’s own SLA becomes a business outage. The last test report is the evidence.",
    },
    {
      domain: "Logging",
      kind: "yes_no",
      prompt: "Are security logs retained for at least 12 months and available to Northline on request within 24 hours?",
      rationale:
        "Incident response and PCI forensic holds need a year of logs. Without this, we cannot reconstruct access after a breach notice.",
    },
    {
      domain: "Incident",
      kind: "text",
      prompt: "What is the named security contact and the notification SLA if Northline data may be involved?",
      rationale:
        "Regulators clock us from discovery, not from when a vendor’s ticket is triaged. A named contact and SLA are what we put in the incident runbook.",
    },
    {
      domain: "Data",
      kind: "yes_no",
      prompt: "Will Northline data leave the contracted regions, including backups and support copies?",
      rationale:
        "Cross-border copies can break the DPA, residency clauses, and PCI scope. We need a yes/no plus where DR and support actually sit.",
    },
  ]),
  pack("tpl_lite", "SIG Lite", "2024.1", "Low / moderate refresh", "2026-04-02", 6, [
    {
      domain: "Governance",
      kind: "text",
      prompt: "Who is the named security contact for Northline, and what is the incident-notification SLA?",
      rationale:
        "Lite reviews still need a reachable owner. Without a named contact, Watchtower alerts have nowhere to land.",
    },
    {
      domain: "Encryption",
      kind: "yes_no",
      prompt: "Is Northline data encrypted in transit (TLS 1.2+) and at rest?",
      rationale:
        "This is the minimum bar before residual can move. A current SOC 2 or ISO 27001 report is how we confirm it without a full SIG.",
    },
    {
      domain: "Access",
      kind: "yes_no",
      prompt: "Is MFA required for all administrative and remote access to systems that hold Northline data?",
      rationale:
        "Most vendor breaches start as stolen passwords. MFA on admin paths is the control we underwrite; a policy extract or IdP screenshot is enough on Lite.",
    },
    {
      domain: "Evidence",
      kind: "yes_no",
      prompt: "Do you have a current SOC 2 Type II, ISO 27001, or equivalent independent report?",
      rationale:
        "The certificate is not paperwork theatre — it is independent proof that encryption, access, and change control were tested. Attach the report (or explain the gap) so we do not restage a full SIG.",
    },
    {
      domain: "Subprocessors",
      kind: "yes_no",
      prompt: "Have any new subprocessors been added since the last review?",
      rationale:
        "A new processor can quietly expand geo, AI, or card scope. A yes means we re-check the DPA; a no should match the last register we hold.",
    },
  ]),
  pack("tpl_inherit", "Northline inherent", "3.2", "Intake scoring", "2026-07-18", 12, [
    {
      domain: "Data",
      kind: "text",
      prompt: "Which Northline data classes will this service store or process (PCI, PII, PHI, Confidential)?",
      rationale:
        "Inherent score is driven first by data class. PCI or PHI without the matching overlay leaves residual unpriced.",
    },
    {
      domain: "Access",
      kind: "yes_no",
      prompt: "Does this vendor receive production or privileged access to Northline systems?",
      rationale:
        "Privileged access jumps inherent regardless of spend. We use this to decide SIG Core vs Lite and whether vaulting evidence is in scope.",
    },
    {
      domain: "Criticality",
      kind: "yes_no",
      prompt: "Does the service sit on a customer-facing or otherwise critical Northline process?",
      rationale:
        "Criticality sets RTO expectations and monitoring intensity. A yes here is why we ask for failover tests later.",
    },
    {
      domain: "Geo",
      kind: "text",
      prompt: "Where is data hosted and processed, including DR and support locations?",
      rationale:
        "Hosting region plus support seats drive concentration and transfer clauses. We need it before legal signs the DPA.",
    },
    {
      domain: "Fourth party",
      kind: "text",
      prompt: "Name the primary subprocessors (cloud, CDN, communications, AI).",
      rationale:
        "Intake is where fourth-party concentration is first visible. Cloud + AI subprocessors often force an overlay.",
    },
  ]),
  pack("tpl_pci", "PCI overlay", "4.0", "Card data", "2026-01-11", 2, [
    {
      domain: "Scope",
      kind: "yes_no",
      prompt: "Does this service store, process, or transmit CHD or PAN, including logs and backups?",
      rationale:
        "If PAN ever touches this service, PCI DSS 4.0 is in contract. A no still needs to cover logs and backups or we will re-scope later.",
    },
    {
      domain: "DSS",
      kind: "text",
      prompt: "Which PCI DSS 4.0 requirements are in scope, and who is the QSA?",
      rationale:
        "We cannot accept residual on card data without a named QSA and a scoped requirement set. This is what the AoC must match.",
    },
    {
      domain: "Tokenisation",
      kind: "yes_no",
      prompt: "Is PAN tokenised before it reaches this service?",
      rationale:
        "Tokenisation can shrink or remove CDE scope. If the answer is no, we need compensating encryption and network evidence.",
    },
    {
      domain: "Network",
      kind: "yes_no",
      prompt: "Is the CDE segmented, and was the last ASV scan inside the required window?",
      rationale:
        "Segmentation plus a current ASV scan are how we prove the CDE is not flat. Attach the latest scan or we keep the vendor at high residual.",
    },
    {
      domain: "Evidence",
      kind: "yes_no",
      prompt: "Can you attach the current AoC / ROC and the network diagram for the in-scope environment?",
      rationale:
        "The Attestation of Compliance (and ROC if we are on the hook) is the certificate for card data. Without it, Northline cannot attest to our own acquirer.",
    },
  ]),
  pack("tpl_bpo", "BPO / offshore overlay", "2.0", "People, sites, DLP", "2026-06-03", 1, [
    {
      domain: "Sites",
      kind: "text",
      prompt: "List delivery sites that will access Northline data, including city and seating model.",
      rationale:
        "Site and seating model drive DLP, CCTV, and print controls. Open floors with PAN access are a standard exam finding.",
    },
    {
      domain: "Endpoint",
      kind: "yes_no",
      prompt: "Are clipboard, print, USB, and local download disabled on the agent desktop / Citrix image?",
      rationale:
        "Most BPO leakage is copy-paste or USB, not a network breach. We need this locked on the image, with a screenshot or GPO extract.",
    },
    {
      domain: "Screening",
      kind: "text",
      prompt: "What background-check standard is used for agents with account or card access?",
      rationale:
        "People risk is the overlay. A named screening standard (and recency) is what HR and the QSA will ask for.",
    },
    {
      domain: "DLP",
      kind: "text",
      prompt: "How is data leakage prevented on voice, chat, and email channels?",
      rationale:
        "Agents still talk and type. DLP on those channels is why we allow offshore seats against PCI / PII.",
    },
    {
      domain: "Access",
      kind: "yes_no",
      prompt: "Is Northline access unique per agent, time-boxed, and revoked within 24 hours of offboarding?",
      rationale:
        "Shared agent IDs make every incident un-attributable. 24-hour revoke is the control we put in the MSA.",
    },
  ]),
  pack("tpl_ai", "AI vendor overlay", "1.1", "Models, training, evals", "2026-08-20", 1, [
    {
      domain: "Model",
      kind: "yes_no",
      prompt: "Is a model card published covering training data, evals, and known failure modes?",
      rationale:
        "Without a model card we cannot judge prompt injection, bias, or data leakage risk. It is the AI equivalent of a SOC 2 system description.",
    },
    {
      domain: "Data",
      kind: "yes_no",
      prompt: "Is Northline data used to train, fine-tune, or evaluate foundation or vendor models?",
      rationale:
        "Training on our data is usually a DPA breach unless we opted in. A yes here blocks residual until legal has a written carve-out.",
    },
    {
      domain: "Retention",
      kind: "text",
      prompt: "How long are prompts, embeddings, and outputs retained, and can Northline opt out?",
      rationale:
        "Retained prompts are still Northline data. Opt-out and deletion SLA are what we need for GDPR / bank secrecy.",
    },
    {
      domain: "Isolation",
      kind: "yes_no",
      prompt: "Is Northline data logically isolated from other tenants in training and inference paths?",
      rationale:
        "Shared embeddings or caches leak across tenants. Isolation is the control we underwrite for AI vendors.",
    },
    {
      domain: "Abuse",
      kind: "text",
      prompt: "What controls exist for prompt injection, data exfiltration via the model, and eval red-teaming?",
      rationale:
        "Models are a new exfil path. We need named controls and the last red-team date, not a marketing page.",
    },
  ]),
]

const bankByQuestionId = new Map(
  questionnaireBank.flatMap((pack) => pack.questions.map((item) => [item.id, item] as const)),
)

export function bankItemById(id: string) {
  return bankByQuestionId.get(id)
}

export function inferQuestionKind(prompt: string): QuestionKind {
  return /^(is|are|does|do|will|have|has|can)\b/i.test(prompt.trim()) ? "yes_no" : "text"
}

export function resolveQuestionMeta(question: { id: string; prompt: string; kind?: QuestionKind; rationale?: string }) {
  const bank = bankItemById(question.id)
  return {
    kind: question.kind ?? bank?.kind ?? inferQuestionKind(question.prompt),
    rationale: question.rationale || bank?.rationale || "",
  }
}
