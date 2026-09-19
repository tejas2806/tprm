# Aegis TPRM — Firestore design

This document is the source of truth for how Northline data is stored in Firestore, how documents are created, and why the layout stays roughly **O(n)** in the rows a screen actually needs.

Project: `tprm-fad35`  
Default tenant: `northline` (`VITE_FIREBASE_TENANT_ID`)  
Typed schema: `src/lib/firestore/schema.ts`  
Paths: `src/lib/firestore/paths.ts`  
Seed: `src/lib/firestore/seed-tenant.ts`  
Rules: `firestore.rules`

---

## 1. Design goals

1. **One tenant, one tree.** Every operational document lives under `tenants/{tenantId}`. There is no root-level `vendors` or `users` collection.
2. **No client joins.** Child rows copy `vendorId` and `vendorName`. A finding list never loads the vendor register to resolve names.
3. **List views stay thin.** Assessment kanban reads assessment cards only. Answers live in a `questions` subcollection (the response store).
4. **Dashboards are O(1).** Counts and trends live on `metrics/kpis` and `metrics/concentration`. They are updated on write, not computed by scanning collections.
5. **Vendor portal is scoped.** A vendor listener is `where vendorId == profile.vendorId`, so `n` is that vendor’s rows, not the bank’s register.
6. **Writes are a fixed fan-out.** An event updates the item, then a handful of denormalized docs (vendor counters, valuation, KPIs, activity). That is O(1) per event, not O(vendors).

What we deliberately do **not** do:

- Embed questions inside the assessment document (would force every pipeline list to download answers).
- Store findings as a map on the vendor (cannot query SLA clocks).
- Compute open-finding counts in the client by loading every finding.

---

## 2. Collection tree

```
tenants/{tenantId}                          // northline
  users/{userId}                            // Auth uid or usr_* pending id
  vendors/{vendorId}                        // vnd_helix
  valuations/{vendorId}                     // same id as the vendor
  assessments/{assessmentId}                // asm_helix
    questions/{questionId}                  // responses live here
  findings/{findingId}                      // fnd_4411
  signals/{signalId}                        // sig_* / auto ids
  activities/{activityId}                   // auto ids
  questionnaires/{questionnaireId}          // tpl_sig
  metrics/kpis                              // single dashboard doc
  metrics/concentration                     // single fourth-party doc
  policies/default                          // single policy doc
```

Document IDs are stable and readable (`vnd_helix`, `asm_helix`, `tpl_sig`) except where Firestore should allocate them (`signals` ingest, `activities`, admin-created users).

---

## 3. How data is created

### 3.1 First sign-in (bootstrap)

1. Firebase Auth creates or restores the session.
2. The client upserts `tenants/northline/users/{authUid}` with role, email, and optional `vendorId`.
3. `ensureTenantSeeded()` reads `tenants/northline`. If `seeded != true`, it writes the full Northline demo in **one batch** (~70 documents):
   - tenant flag
   - desk directory (`usr_admin`, `usr_infosec`, …)
   - 12 vendors + 12 valuations
   - 7 assessments + their question responses
   - findings, signals, activities
   - questionnaire library
   - `metrics/kpis`, `metrics/concentration`, `policies/default`
4. The tenant doc is marked `seeded: true`. Later logins skip the batch.
5. Role-scoped `onSnapshot` listeners attach.

Rules allow this batch only while the tenant is unseeded (`bootstrapping`), or afterwards for InfoSec/Admin according to role. To re-seed, delete `tenants/northline` in the console and sign in again.

### 3.2 After bootstrap — who creates what

| Action | Writer | Documents created / updated |
|---|---|---|
| Sign in | any authenticated user | `users/{authUid}` upsert (merge). `createdAt` kept on first write. |
| Add user (Admin → Users) | admin / infosec | `users/usr_{timestamp}` pending row. Auth account is created on that person’s first login (`demo123`). |
| First login of a pending user | that user | New `users/{authUid}`. Directory UI dedupes by email and prefers the Auth uid. |
| Publish policy | admin | `policies/default` merge. |
| Intake a vendor | infosec | `vendors/{id}`, `valuations/{id}`, `assessments/{id}`, KPI `increment`, activity. |
| Answer a question | vendor or infosec | `assessments/{id}/questions/{qid}` + assessment `progress`. |
| Mark question reviewed | infosec | question `reviewed`, assessment `progress`. |
| Advance assessment | infosec | assessment `stage` / `progress`. If stage becomes `monitoring`, in-flight counters −1. |
| Change finding status | infosec | finding + vendor/KPI counters. Close/accept also writes valuation (residual −6, rating +2). |
| Vendor finding note | vendor | finding `vendorNote`; open → `in_progress`. |
| Upload evidence | vendor | vendor `certifications[]`. |
| Watchtower ingest | infosec client (if policy `watchtower`) | new signal, vendor residual/rating, valuation, optional critical finding, activity, KPI increments. |
| KPI sample (~5s) | infosec client | `metrics/kpis.residualTrend` / `alertTrend` (last 14 points). |

Nothing in Admin, InfoSec, or Vendor views is read from `localStorage` or in-memory seed after sign-in. Seed TypeScript files are **writers** for the first batch only.

---

## 4. Document contracts

Timestamps are ISO-8601 strings. Scores are integers 0–99 unless noted.

### 4.1 `tenants/{tenantId}`

| Field | Type | Notes |
|---|---|---|
| `name` | string | `Northline Bank` |
| `slug` | string | `northline` |
| `fiscalPeriod` | string | `FY26` |
| `createdAt` | string | First seed |
| `seeded` | boolean | Latch for bootstrap |

### 4.2 `users/{userId}` — directory

**IDs**

- Logged-in profile: Firebase Auth uid (28-char).
- Seeded desk: `usr_admin`, `usr_infosec`, `usr_infosec_mei`, `usr_vendor_helix`, `usr_vendor_drift`.
- Admin-added before first login: `usr_{Date.now()}`.

| Field | Type | Notes |
|---|---|---|
| `email` | string | Lowercase. Used to resolve pending users on first login. |
| `name` | string | |
| `title` | string | |
| `role` | `"admin" \| "infosec" \| "vendor"` | Security rules `get()` this doc at `users/{auth.uid}`. |
| `vendorId` | string? | Required for vendor portal scope (`vnd_helix`, …). |
| `vendorName` | string? | Copied for directory display. |
| `active` | boolean | |
| `createdAt` | string | |

Role resolution order: custom claims → `users/{uid}` → `users` where `email == token.email` → built-in desk map.

### 4.3 `vendors/{vendorId}` — register

**ID:** `vnd_{slug}` (`vnd_helix`). Intake slugs the company name.

This document is the vendor **card**. Residual and rating are also mirrored on `valuations/{vendorId}` so history does not bloat the register row.

| Field | Type | Notes |
|---|---|---|
| `name`, `legalName`, `category` | string | |
| `owner`, `businessUnit` | string | Desk owner name (not uid, for display). |
| `tier` | `critical \| high \| moderate \| low` | From inherent score. |
| `status` | `intake \| assessment \| remediation \| monitoring \| approved \| offboarding` | |
| `inherent`, `residual`, `securityRating` | number | Live scores. |
| `inherentDna` | `{ data, access, criticality, geo, fourth }` | Breakdown of inherent. |
| `dataClasses` | string[] | `PCI`, `PII`, … |
| `hosting`, `geos`, `subprocessors` | string / string[] | Concentration input. |
| `certifications` | `{ name, expires, status }[]` | Vendor evidence appends here. |
| `contractEnd`, `lastAssessed`, `nextReview` | string | Dates. |
| `spend`, `description`, `website` | string | |
| `contacts` | `{ name, role, email }[]` | |
| `products` | string[] | |
| `searchName` | string | Lowercased name for prefix search later. |
| `openFindingCount` | number | Denormalized. |
| `openSignalCount` | number | Denormalized unacked. |
| `inFlightAssessmentCount` | number | Assessments not in `monitoring`. |
| `lastSignalAt` | string? | Last ingest. |
| `updatedAt` | string | |

### 4.4 `valuations/{vendorId}` — residual / rating history

**ID equals the vendor id.** One document, not a time-series collection. History arrays stay short (seed: 8 points; live writes merge current scores).

| Field | Type | Notes |
|---|---|---|
| `vendorId`, `vendorName` | string | |
| `inherent`, `residual`, `securityRating` | number | Source of truth overlaid onto the vendor card in the UI. |
| `residualHistory` | number[] | Sparkline. |
| `ratingHistory` | number[] | Sparkline. |
| `updatedAt` | string | |

Created on seed and on intake. Updated when Watchtower ticks, a finding closes, or residual is restated.

### 4.5 `assessments/{assessmentId}` — pipeline card

**ID:** `asm_{slug}` (`asm_helix`). Intake: `asm_` + vendor slug.

| Field | Type | Notes |
|---|---|---|
| `vendorId`, `vendorName` | string | Copied. |
| `template` | string | `SIG Core`, `AI vendor overlay`, … |
| `stage` | `intake \| scoping \| questionnaire \| review \| decision \| monitoring` | |
| `due` | string | Date. |
| `owner` | string | Analyst name. |
| `progress` | number | 0–100. |
| `questionCount` | number | Avoids counting the subcollection. |
| `flagCount` | number | AI `flag` / `gap` count. |
| `updatedAt` | string | |

Kanban and vendor “due from you” lists read **this collection only**.

### 4.6 `assessments/{id}/questions/{questionId}` — responses

This is the questionnaire **response** store. It is not the SIG template library.

| Field | Type | Notes |
|---|---|---|
| `vendorId` | string | Lets rules and vendor queries stay on equality. |
| `assessmentId` | string | Parent id, denormalized. |
| `domain` | string | Encryption, Access, Model, … |
| `prompt` | string | Question text (copied from the template at launch). |
| `answer` | string | Vendor response. |
| `evidence` | string | Filename / pointer. |
| `ai` | `{ verdict: ok \| flag \| gap, note, confidence }` | Overlay. |
| `reviewed` | boolean | InfoSec review. |
| `order` | number | Display order. |
| `updatedAt` | string | |

Created at seed (or later when a template is launched onto an assessment). Updated when the vendor answers or InfoSec marks reviewed.

### 4.7 `questionnaires/{id}` — template library

**IDs:** `tpl_sig`, `tpl_lite`, `tpl_inherit`, `tpl_pci`, `tpl_bpo`, `tpl_ai`.

| Field | Type | Notes |
|---|---|---|
| `name`, `version` | string | |
| `items` | number | Question count in the published template. |
| `usedBy` | number | How many vendors use it. |
| `focus` | string | Short purpose. |
| `updated` | string | Date. |

InfoSec library page. In-flight counts are derived from assessments that mention the template name — that is O(assessments), not O(questions).

### 4.8 `findings/{findingId}`

**IDs:** `fnd_4411` (seed) or `fnd_live_{timestamp}` (Watchtower critical).

| Field | Type | Notes |
|---|---|---|
| `vendorId`, `vendorName` | string | |
| `title`, `detail` | string | |
| `severity` | risk tier | |
| `status` | `open \| in_progress \| accepted \| closed` | |
| `slaDays` | number | From policy at create time. |
| `slaDeadline` | string | **Stored** = `opened + slaDays`. Sort is an index walk. |
| `owner`, `control` | string | |
| `opened` | string | Date. |
| `vendorNote` | string? | Vendor portal response. |
| `updatedAt` | string | |

### 4.9 `signals/{signalId}` — Watchtower

Seed uses `sig_1`…`sig_7`. Live ingest uses auto ids.

| Field | Type | Notes |
|---|---|---|
| `vendorId`, `vendorName` | string | |
| `kind` | `breach \| cve \| cert \| rating \| news \| expiry \| ai` | |
| `severity` | risk tier | |
| `title`, `detail` | string | |
| `at` | string | Event time. |
| `acked` | boolean | Ticker shows `acked == false`. |

### 4.10 `activities/{activityId}` — audit

Auto ids. Capped client query: last 40 by `at` desc.

| Field | Type | Notes |
|---|---|---|
| `at` | string | |
| `kind` | `signal \| finding \| assessment \| intake \| ack \| rating \| access` | |
| `title`, `detail` | string | |

InfoSec and Admin read. Vendors may **create** (questionnaire / finding responses) but do not list the collection.

### 4.11 `metrics/kpis` — one document

| Field | Type | Notes |
|---|---|---|
| `vendorCount` | number | |
| `materialCount` | number | Critical + high vendors. |
| `openAlerts` | number | Unacked signals. |
| `openFindings` | number | |
| `slaAtRisk` | number | Open findings with short SLA. |
| `inFlightAssessments` | number | |
| `avgResidual`, `avgRating` | number | |
| `residualTrend` | number[] | Last ~14 samples. |
| `alertTrend` | number[] | Last ~14 samples. |
| `updatedAt` | string | |

Command center charts read this doc. They do not average every vendor on each paint (the store still has the vendor list for tables; KPIs are the cheap path).

### 4.12 `metrics/concentration` — one document

| Field | Type | Notes |
|---|---|---|
| `fourthParties` | `Record<string, number>` | `{ "AWS": 7, "Cloudflare": 3, … }` |
| `updatedAt` | string | |

Recomputed on seed. Intake of a vendor with subprocessors should increment the matching keys (same O(1) fan-out pattern).

### 4.13 `policies/default` — one document

| Field | Type | Notes |
|---|---|---|
| `criticalSlaDays` | number | Default `3`. New critical findings use this. |
| `highSlaDays` | number | Default `7`. |
| `watchtower` | boolean | Pauses live ingest when false. |
| `vendorPortal` | boolean | Module flag. |
| `aiOverlay` | boolean | Module flag. |
| `updatedAt` | string | |

---

## 5. Relationships (logical, not Firestore joins)

```
users.vendorId ─────────────► vendors.id
vendors.id  ═ valuations.id          (1:1, same document id)
vendors.id  ── assessments.vendorId  (1:n)
assessments.id ── questions.assessmentId
vendors.id  ── findings.vendorId
vendors.id  ── signals.vendorId
questionnaires.name ── assessments.template   (by name, not foreign key)
```

There is no `responses` collection. A response **is** a `questions` document under an assessment.

---

## 6. Write fan-out (O(1) per event)

Every mutating action updates a fixed set of documents. Never “load all findings and recount.”

```
New signal
  + signals/{auto}
  + vendors/{id}.openSignalCount++
  + vendors/{id}.residual / securityRating
  + valuations/{id}
  + metrics/kpis.openAlerts++
  + activities/{auto}
  [if critical] + findings/{id} + openFindingCount++

Close / accept finding
  ~ findings/{id}.status
  − vendors/{id}.openFindingCount
  ~ vendors/{id}.residual / securityRating
  ~ valuations/{id}
  − metrics/kpis.openFindings
  + activities/{auto}

Intake vendor
  + vendors/{id}
  + valuations/{id}
  + assessments/{id}
  + metrics/kpis.vendorCount++
  + metrics/kpis.inFlightAssessments++
  + activities/{auto}

Answer question
  ~ assessments/{id}/questions/{qid}
  ~ assessments/{id}.progress
  + activities/{auto}
```

`increment()` is used for counters so two clients cannot clobber each other.

---

## 7. How each role reads

| Role | Listeners |
|---|---|
| **Admin** | Full tenant collections: users, vendors, valuations, assessments, questions (per open assessment), findings, signals, questionnaires, activities, KPIs, policies. |
| **InfoSec** | Same operational collections as Admin (directory + risk desk). |
| **Vendor** | `vendors/{theirId}`, `valuations/{theirId}`, assessments / findings / signals `where vendorId == theirs`, questions under those assessments, `policies/default`. No users, no questionnaires library, no activities list, no KPIs. |

Rules enforce the same shape: `get(tenants/{tid}/users/{auth.uid}).data.role` and `.vendorId`. Custom Auth claims are optional; the profile document is enough.

---

## 8. Indexes

Composite indexes live in `firestore.indexes.json` for the filters the desk actually runs:

- vendors: `tier + name`, `status + name`, `tier + status + name`
- assessments: `vendorId + due`, `stage + due`
- findings: `vendorId + slaDeadline`, `status + slaDeadline`, both together
- signals: `acked + at desc`, `vendorId + at desc`, both together
- users: `role + name`

Single-field queries (`orderBy("order")` on questions, `where email ==`) use automatic indexes.

---

## 9. Example documents

### Vendor (HelixPay)

```
tenants/northline/vendors/vnd_helix
{
  "name": "HelixPay",
  "tier": "critical",
  "status": "remediation",
  "inherent": 92,
  "residual": 71,
  "securityRating": 74,
  "searchName": "helixpay",
  "openFindingCount": 2,
  "openSignalCount": 2,
  "inFlightAssessmentCount": 1,
  "subprocessors": ["AWS", "Cloudflare", "Twilio"],
  "updatedAt": "2026-09-12T07:00:00.000Z"
}
```

### Assessment card (no answers)

```
tenants/northline/assessments/asm_helix
{
  "vendorId": "vnd_helix",
  "vendorName": "HelixPay",
  "template": "SIG Core + PCI overlay",
  "stage": "review",
  "progress": 82,
  "questionCount": 5,
  "flagCount": 3,
  "due": "2026-09-12"
}
```

### Response (question subcollection)

```
tenants/northline/assessments/asm_helix/questions/q2
{
  "vendorId": "vnd_helix",
  "assessmentId": "asm_helix",
  "domain": "Access",
  "prompt": "Are production break-glass accounts unique, vaulted, and reviewed monthly?",
  "answer": "Shared root still exists for the issuing cluster.",
  "evidence": "Access-review-Q2.xlsx",
  "ai": { "verdict": "flag", "note": "Conflicts with 2025 SIG Q14.", "confidence": 91 },
  "reviewed": false,
  "order": 1
}
```

### Valuation

```
tenants/northline/valuations/vnd_helix
{
  "vendorId": "vnd_helix",
  "vendorName": "HelixPay",
  "inherent": 92,
  "residual": 71,
  "securityRating": 74,
  "residualHistory": [68, 69, 70, 71],
  "ratingHistory": [76, 75, 74, 74]
}
```

---

## 10. Complexity budget

| Screen | Reads |
|---|---|
| Command center KPIs | 1 doc (`metrics/kpis`) |
| Vendor register | O(vendors) ≤ ~80 |
| Assessment pipeline | O(assessments) — no questions |
| Assessment workspace | 1 assessment + O(questions for that file) |
| Findings / Watchtower | O(open rows), index on `slaDeadline` / `at` |
| Vendor portal | O(that vendor’s assessments + findings + signals + questions) |
| Concentration | 1 doc, or O(vendors) if rebuilding from `subprocessors` |
| Users / policies | O(users) / 1 policy doc |

Worst case for a Northline-sized tenant is a few dozen documents per snapshot, not a cartesian product of vendors × findings × questions.

---

## 11. Code map

| Concern | File |
|---|---|
| Types | `src/lib/firestore/schema.ts` |
| Refs | `src/lib/firestore/paths.ts` |
| Doc ↔ UI mapping | `src/lib/firestore/mappers.ts` |
| Counter / valuation writes | `src/lib/firestore/writes.ts` |
| First-run batch | `src/lib/firestore/seed-tenant.ts` |
| Profile upsert / email lookup | `src/lib/firestore/profile.ts` |
| Live listeners + mutations | `src/state/tprm-store.tsx` |
| Auth + first user doc | `src/state/auth.tsx` |
| Rules | `firestore.rules` |
| Indexes | `firestore.indexes.json` |
