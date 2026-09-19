import { useMemo, useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Surface, TierMark, RiskDna, ScoreRing } from "@/components/marks"
import { scoreInherent, tierFromScore } from "@/lib/risk"
import { useTprm } from "@/state/tprm-store"
import { analysts } from "@/data/seed"
import type { DataClass, IntakeDraft } from "@/types"
import { cn } from "cn"

const empty: IntakeDraft = {
  name: "",
  category: "SaaS",
  businessUnit: "Technology",
  owner: "Suyog Khairnar",
  description: "",
  dataClasses: [],
  prodAccess: false,
  customerFacing: false,
  criticalProcess: false,
  hosting: "AWS",
  geos: ["US"],
  subprocessorCount: 1,
  hasSoc2: false,
}

const steps = ["Business", "Data & access", "Hosting", "Score"]
const classes: DataClass[] = ["PCI", "PHI", "PII", "Confidential", "Internal", "Public"]
const geos = ["US", "GB", "IE", "DE", "IN", "PH", "SG", "AU"]

export function IntakePage() {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<IntakeDraft>(empty)
  const { addVendorFromIntake } = useTprm()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const scored = useMemo(() => scoreInherent(draft), [draft])
  const tier = tierFromScore(scored.score)

  async function submit() {
    if (!draft.name.trim()) {
      toast.error("Name the vendor before launching the file.")
      setStep(0)
      return
    }
    setSaving(true)
    try {
      const { vendor } = await addVendorFromIntake(draft)
      toast.success(`${vendor.name} opened on the register as ${tier}.`)
      navigate(`/vendors/${vendor.id}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not write the vendor to Firestore."
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Onboarding</p>
        <h1 className="text-2xl font-semibold tracking-tight">Intake</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Score inherent risk before procurement sends a contract. Residual comes later.
        </p>
      </div>

      <ol className="grid grid-cols-4 gap-2">
        {steps.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => setStep(i)}
              className={cn(
                "w-full rounded-md border px-2.5 py-2 text-left text-xs transition-colors duration-150",
                i === step ? "border-primary/40 bg-primary/5 text-foreground" : "border-border text-muted-foreground",
              )}
            >
              <span className="font-mono text-[10px]">0{i + 1}</span>
              <span className="mt-1 block font-medium">{label}</span>
            </button>
          </li>
        ))}
      </ol>

      <Surface className="p-6">
        <div key={step} className="fade-in">
        {step === 0 ? (
          <div className="space-y-4">
            <Field label="Vendor name">
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="e.g. Cobalt Ledger"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category">
                <Input
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                />
              </Field>
              <Field label="Business unit">
                <Input
                  value={draft.businessUnit}
                  onChange={(e) => setDraft({ ...draft, businessUnit: e.target.value })}
                />
              </Field>
            </div>
            <Field label="InfoSec owner">
              <div className="flex flex-wrap gap-2">
                {analysts.map((name) => (
                  <Button
                    key={name}
                    type="button"
                    size="sm"
                    variant={draft.owner === name ? "default" : "outline"}
                    onClick={() => setDraft({ ...draft, owner: name })}
                  >
                    {name}
                  </Button>
                ))}
              </div>
            </Field>
            <Field label="What does the service do?">
              <Textarea
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                rows={4}
              />
            </Field>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-5">
            <Field label="Data classes in scope">
              <div className="flex flex-wrap gap-3">
                {classes.map((item) => {
                  const on = draft.dataClasses.includes(item)
                  return (
                    <label key={item} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={on}
                        onCheckedChange={(checked) => {
                          setDraft({
                            ...draft,
                            dataClasses: checked
                              ? [...draft.dataClasses, item]
                              : draft.dataClasses.filter((c) => c !== item),
                          })
                        }}
                      />
                      {item}
                    </label>
                  )
                })}
              </div>
            </Field>
            <Toggle
              label="Production or privileged access"
              checked={draft.prodAccess}
              onChange={(prodAccess) => setDraft({ ...draft, prodAccess })}
            />
            <Toggle
              label="Customer-facing (channel, app, or OTP)"
              checked={draft.customerFacing}
              onChange={(customerFacing) => setDraft({ ...draft, customerFacing })}
            />
            <Toggle
              label="Sits on a critical business process"
              checked={draft.criticalProcess}
              onChange={(criticalProcess) => setDraft({ ...draft, criticalProcess })}
            />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <Field label="Hosting">
              <Input
                value={draft.hosting}
                onChange={(e) => setDraft({ ...draft, hosting: e.target.value })}
              />
            </Field>
            <Field label="Processing geos">
              <div className="flex flex-wrap gap-2">
                {geos.map((geo) => {
                  const on = draft.geos.includes(geo)
                  return (
                    <Button
                      key={geo}
                      type="button"
                      size="sm"
                      variant={on ? "default" : "outline"}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          geos: on ? draft.geos.filter((g) => g !== geo) : [...draft.geos, geo],
                        })
                      }
                    >
                      {geo}
                    </Button>
                  )
                })}
              </div>
            </Field>
            <Field label={`Known subprocessors · ${draft.subprocessorCount}`}>
              <Slider
                value={[draft.subprocessorCount]}
                min={0}
                max={12}
                step={1}
                onValueChange={(value) =>
                  setDraft({ ...draft, subprocessorCount: value[0] ?? 0 })
                }
              />
            </Field>
            <Toggle
              label="Current SOC 2 Type II on file"
              checked={draft.hasSoc2}
              onChange={(hasSoc2) => setDraft({ ...draft, hasSoc2 })}
            />
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
            <ScoreRing value={scored.score} label="Inherent" />
            <div>
              <div className="mb-3 flex items-center gap-2">
                <TierMark tier={tier} />
                <p className="text-sm text-muted-foreground">
                  Auto-tier from Northline inherent model v3.2
                </p>
              </div>
              <RiskDna dna={scored.dna} />
              <p className="mt-4 text-sm text-muted-foreground">
                {scored.score >= 55
                  ? "SIG Core will be launched. Questionnaire goes to the vendor TAM the same day."
                  : "SIG Lite is enough unless the business later grants production access."}
              </p>
            </div>
          </div>
        ) : null}
        </div>

        <div className="mt-6 flex justify-between">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
          {step < 3 ? (
            <Button type="button" onClick={() => setStep((s) => s + 1)}>
              Continue
            </Button>
          ) : (
            <Button type="button" onClick={() => void submit()} disabled={saving}>
              {saving ? "Launching…" : "Launch on the register"}
            </Button>
          )}
        </div>
      </Surface>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-xl bg-muted/40 px-3 py-3 text-sm">
      {label}
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}
