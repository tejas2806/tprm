# Aegis TPRM — end-to-end workflow

How Northline Bank runs third-party risk in this product: **Admin** sets the tenant, **InfoSec** runs the risk desk, **Vendor** answers and remediates. All three desks read and write the same Firestore tenant (`tenants/northline`). Nothing is siloed in the browser.

Default password for directory users is `demo123`.

| Role | Home | Who they are |
|---|---|---|
| Admin | `/admin` | Tenant operator. Users, access, SLA policy, audit. Not the risk queue. |
| InfoSec | `/` | Analysts. Register, intake, assessments, Watchtower, findings, residual. |
| Vendor | `/vendor` | One company (e.g. HelixPay). Questionnaire, findings, evidence for **their** `vendorId` only. |

```
Admin prepares the tenant
        │
        ▼
InfoSec onboards a vendor ──► assessment launched
        │
        ▼
Vendor answers + uploads evidence
        │
        ▼
InfoSec reviews, opens findings, watches residual
        │
        ▼
Vendor remediates ──► InfoSec closes ──► residual drops
        │
        ▼
Admin sees the audit trail and can tighten policy
```

---

## 1. Sign-in

1. Open `/login` and pick a desk (InfoSec / Admin / Vendor) or type any directory email.
2. Firebase Auth signs in, or **creates** the Auth user on first use when the password is `demo123`.
3. Role comes from the Firestore directory (`users` + `emails/{address}`), not from the radio button alone.
4. The session upserts `users/{authUid}`. The app then seeds the tenant once if it is empty, and attaches live listeners.

Desk accounts already in the seed:

| Email | Role | Scope |
|---|---|---|
| `admin@northline.example` | Admin | Northline |
| `suyog@northline.example` | InfoSec | Northline desk |
| `mei.chen@northline.example` | InfoSec | Northline desk |
| `ava.quinn@helixpay.example` | Vendor | HelixPay (`vnd_helix`) |
| `ivy.cho@drift.example` | Vendor | Drift Analytics (`vnd_drift`) |

Admin can add more people. Those users sign in with the same `demo123` after they appear in the directory.

---

## 2. Admin — prepare the tenant

Admin does **not** score vendors. They make sure the right people can work and that SLA clocks are legal.

### Overview (`/admin`)

Counts from Firestore: directory size, vendors on the register, open findings, live alerts, recent audit events.

### Users (`/admin/users`)

Add InfoSec, Admin, or Vendor contacts.

- Name + work email + role.
- For **Vendor**, set the company name so it matches a register vendor (e.g. `HelixPay`). That copies `vendorId` onto the user. Without a match, the portal has no file to open.
- Writes `users/usr_*` and `emails/{email}`. Auth is created on that person’s first login.

### Access (`/admin/access`)

Role × permission matrix (register, intake, assessments, Watchtower, findings, reports, users, policy, portal). This is the intended split: Admin owns users/policy; InfoSec owns the queue; Vendor owns the portal.

### Policies (`/admin/policies`)

Published to `policies/default`:

| Setting | Effect |
|---|---|
| Critical SLA (days) | New critical findings get this clock. |
| High SLA (days) | High findings use this. |
| Watchtower live feed | When off, InfoSec ingest pauses. |
| Vendor portal | Module flag. |
| AI overlay | Module flag on questionnaires. |

### Audit (`/admin/audit`)

Last ~40 activity rows: intake, answers, acks, finding status, rating ticks, directory adds. InfoSec and vendors **write** these; Admin **reads** them.

When Admin is done, InfoSec can work.

---

## 3. InfoSec — run the risk desk

### Dashboard (`/`)

Live residual / alert trends from `metrics/kpis`, open findings, in-flight assessments, Watchtower ticker. This is the operations home, not a static report.

### Intake a new vendor (`/intake`)

Business unit, data classes, production access, hosting, geos, SOC 2.

1. Inherent score is computed (data + access + criticality + geo + fourth parties).
2. Tier is derived (`critical` / `high` / `moderate` / `low`).
3. Firestore writes:
   - `vendors/{vnd_*}` on the register (status `intake`)
   - `valuations/{same id}` with residual = inherent
   - `assessments/{asm_*}` (SIG Core if inherent ≥ 55, else SIG Lite)
   - KPI increments + an activity row

The vendor is now on the register. Residual does not drop until findings close or the file is reviewed.

### Register and dossier (`/vendors`, `/vendors/:id`)

Register is every vendor card (tier, residual, rating, status). The dossier is that vendor’s assessments, findings, signals, evidence, and inherent DNA — no client-side join across the whole bank.

### Questionnaires library (`/questionnaires`)

Templates (`SIG Core`, `SIG Lite`, Northline inherent, PCI / BPO / AI overlays). These are **catalog** docs. Actual answers live under each assessment.

### Assessments (`/assessments`, `/assessments/:id`)

Pipeline stages:

`intake → scoping → questionnaire → review → decision → monitoring`

- **Kanban** reads assessment cards only (progress, stage, due). Answers are not embedded.
- **Workspace** loads `assessments/{id}/questions/*` — the response store.
- Vendor answers appear here in real time.
- AI overlay marks each answer `ok` / `flag` / `gap`.
- InfoSec marks a question **reviewed** and can **advance** the stage.
- Advancing to `monitoring` decrements in-flight counters.

### Monitoring / Watchtower (`/watchtower`)

External-style signals (CVE, cert expiry, rating, breach, AI). When the policy flag is on, the InfoSec client also **ingests** new signals every few seconds:

- New `signals` row, vendor residual/rating + valuation, KPI `openAlerts++`
- Critical events can open a finding with the Admin critical SLA
- High/critical toasts on the desk (never on the login page)

InfoSec acknowledges one signal or all. Acked rows leave the ticker.

### Findings (`/findings`)

Open / in progress stay on an SLA clock (`opened + slaDays`, stored as `slaDeadline`).

| InfoSec action | What happens |
|---|---|
| Leave `open` | Clock keeps running. Residual held. |
| `in_progress` | Vendor is working it. |
| `accepted` or `closed` | Open-finding counter −1. Residual −6, rating +2 on that vendor’s valuation. |

Residual is not a vibe score. It moves when findings close or Watchtower restates risk.

### Fourth parties (`/concentration`)

Subprocessors rolled up (AWS, Cloudflare, Twilio, …). Shows where many material vendors share one fourth party.

### Reports (`/reports`)

CRO-style pack: position, material exceptions, concentration. Snapshot of the same Firestore collections.

---

## 4. Vendor — answer and remediate

A vendor user **must** have `vendorId` (from seed or Admin “company” matching a register name). Listeners are scoped: only that vendor’s card, assessments, questions, findings, signals, and valuation.

### Home (`/vendor`)

How Northline sees them: residual, rating, next review, assessments due, open findings, unacked monitoring asks.

### Questionnaire (`/vendor/questionnaire`)

1. Opens the in-flight assessment that has questions (e.g. HelixPay SIG Core + PCI).
2. Vendor writes **answer** and **evidence** pointer per question.
3. Writes `assessments/{id}/questions/{qid}` and bumps assessment `progress`.
4. Reviewed flag resets so InfoSec must look again.
5. InfoSec workspace updates immediately (same documents).

If the assessment is still in scoping with no questions, the portal says to wait.

### Findings (`/vendor/findings`)

Vendor cannot close a finding. They leave a **vendor note**. `open` becomes `in_progress`. InfoSec still owns accept/close and the residual move.

### Evidence (`/vendor/evidence`)

Uploads a certification onto the vendor card (`certifications[]`). InfoSec sees it on the dossier.

---

## 5. The loop (one vendor, start to finish)

Using HelixPay as the example.

1. **Admin** has already published SLAs (critical 3d, high 7d) and Watchtower on. Ava Quinn exists as a vendor user on `vnd_helix`.
2. **InfoSec** already has HelixPay on the register (or intakes a new name the same way). Assessment `asm_helix` is in `review` with five questions.
3. **Ava** signs in → `/vendor`. She answers the break-glass question and attaches `Access-review-Q2.xlsx`.
4. **Suyog** opens `/assessments/asm_helix`. The new answer is there; AI still flags shared root. He marks reviewed items and leaves the IAM finding `fnd_root` open.
5. Watchtower posts CVE-2026-4411. If it is critical and new, a finding is opened with the Admin critical SLA.
6. **Ava** responds on `/vendor/findings` (“patch window Friday”). Status → `in_progress`.
7. **Suyog** confirms the patch, sets the finding `closed`. HelixPay residual drops; valuation history updates; KPI open-findings decrements.
8. He advances the assessment toward `monitoring`.
9. **Admin** opens `/admin/audit` and sees the answer, the vendor note, and the close — without entering the risk queue.

That is the product: Admin governs, InfoSec judges residual, Vendor supplies facts.

---

## 6. Who can touch what

| Data | Admin | InfoSec | Vendor |
|---|---|---|---|
| Users / email directory | write | read (desk) | own profile only |
| Policies | write | read | read |
| Audit activities | read | read + create | create only |
| Vendors / valuations | read | write | own vendor (evidence) |
| Assessments | read | write + advance | own, update progress via answers |
| Question responses | — | review | answer + evidence |
| Questionnaire templates | — | read | — |
| Findings | read | status + residual | note only |
| Signals | read | write + ack | read own |
| KPIs / concentration | read | write | — |

Rules enforce the same split: vendor queries are `where vendorId == profile.vendorId`.

---

## 7. What “live” means

After login, each desk holds Firestore snapshots. When Ava saves an answer, Suyog’s workspace and the command-center progress tick without a refresh. When Suyog closes a finding, Ava’s residual on `/vendor` moves. When Admin turns Watchtower off, ingest stops. The workflow is one tenant, three doors.

For how those documents are shaped, see [design.md](./design.md).
