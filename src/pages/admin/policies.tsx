import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Surface } from "@/components/marks"
import { useTprm } from "@/state/tprm-store"

export function AdminPolicies() {
  const { policies, savePolicies } = useTprm()
  const [criticalSla, setCriticalSla] = useState(String(policies.criticalSlaDays))
  const [highSla, setHighSla] = useState(String(policies.highSlaDays))
  const [watchtower, setWatchtower] = useState(policies.watchtower)
  const [vendorPortal, setVendorPortal] = useState(policies.vendorPortal)
  const [aiOverlay, setAiOverlay] = useState(policies.aiOverlay)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setCriticalSla(String(policies.criticalSlaDays))
    setHighSla(String(policies.highSlaDays))
    setWatchtower(policies.watchtower)
    setVendorPortal(policies.vendorPortal)
    setAiOverlay(policies.aiOverlay)
  }, [policies])

  async function publish() {
    setSaving(true)
    try {
      await savePolicies({
        criticalSlaDays: Number(criticalSla) || 3,
        highSlaDays: Number(highSla) || 7,
        watchtower,
        vendorPortal,
        aiOverlay,
        updatedAt: new Date().toISOString(),
      })
      toast.success(`Policy saved. Critical SLA ${criticalSla}d · high ${highSla}d.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save policy.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Control plane</p>
        <h1 className="text-2xl font-semibold tracking-tight">Policies</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          SLA clocks, Watchtower ingest, and vendor portal features for Northline. Stored in Firestore.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Surface className="space-y-4 p-5">
          <h2 className="text-lg font-semibold tracking-tight">Finding SLAs</h2>
          <div className="space-y-1.5">
            <Label htmlFor="crit">Critical (days)</Label>
            <Input id="crit" value={criticalSla} onChange={(event) => setCriticalSla(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="high">High (days)</Label>
            <Input id="high" value={highSla} onChange={(event) => setHighSla(event.target.value)} />
          </div>
        </Surface>
        <Surface className="space-y-4 p-5">
          <h2 className="text-lg font-semibold tracking-tight">Modules</h2>
          <Row label="Watchtower live feed" checked={watchtower} onChange={setWatchtower} />
          <Row label="Vendor portal" checked={vendorPortal} onChange={setVendorPortal} />
          <Row label="AI overlay on questionnaires" checked={aiOverlay} onChange={setAiOverlay} />
        </Surface>
      </div>
      <Button onClick={() => void publish()} disabled={saving}>
        {saving ? "Publishing…" : "Publish policy"}
      </Button>
    </div>
  )
}

function Row({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm">{label}</p>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
