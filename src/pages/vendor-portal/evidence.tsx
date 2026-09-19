import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Surface } from "@/components/marks"
import { formatDate } from "@/lib/format"
import { useAuth } from "@/state/auth"
import { useTprm } from "@/state/tprm-store"

export function VendorEvidence() {
  const { user } = useAuth()
  const { vendors, addVendorEvidence } = useTprm()
  const vendor = vendors.find((item) => item.id === user?.vendorId)
  const [name, setName] = useState("")
  const [expires, setExpires] = useState("2027-09-12")

  if (!vendor) return <p className="text-sm text-muted-foreground">No vendor file is linked to this login.</p>

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Trust centre</p>
        <h1 className="text-2xl font-semibold tracking-tight">Evidence</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Certificates land on your Northline dossier the moment you upload.
        </p>
      </div>
      <Surface className="space-y-3 p-5">
        <h2 className="text-lg font-semibold tracking-tight">Upload</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cert">Document name</Label>
            <Input id="cert" value={name} onChange={(event) => setName(event.target.value)} placeholder="SOC 2 Type II 2026" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp">Expires</Label>
            <Input id="exp" type="date" value={expires} onChange={(event) => setExpires(event.target.value)} />
          </div>
        </div>
        <Button
          onClick={() => {
            if (!name.trim()) {
              toast.error("Name the evidence file.")
              return
            }
            addVendorEvidence(vendor.id, { name: name.trim(), expires, status: "valid" })
            toast.success("Evidence posted to the vault.")
            setName("")
          }}
        >
          Upload to vault
        </Button>
      </Surface>
      <Surface className="p-5">
        <h2 className="mb-3 text-lg font-semibold tracking-tight">On file</h2>
        {vendor.certifications.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing uploaded yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {vendor.certifications.map((cert) => (
              <li key={`${cert.name}-${cert.expires}`} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{cert.name}</p>
                  <p className="text-xs text-muted-foreground">Expires {formatDate(cert.expires)}</p>
                </div>
                <span className="font-mono text-xs uppercase">{cert.status}</span>
              </li>
            ))}
          </ul>
        )}
      </Surface>
    </div>
  )
}
