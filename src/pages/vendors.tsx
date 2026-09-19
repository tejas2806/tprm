import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusChip, Surface, TierMark } from "@/components/marks"
import { formatDate } from "@/lib/format"
import { LiveNumber } from "@/components/live-number"
import { useTprm } from "@/state/tprm-store"
import { cn } from "cn"
import type { RiskTier, VendorStatus } from "@/types"
import { Button } from "@/components/ui/button"

export function VendorsPage() {
  const { now, vendors, ready, loadError } = useTprm()
  const [q, setQ] = useState("")
  const [tier, setTier] = useState<string>("all")
  const [status, setStatus] = useState<string>("all")

  const rows = useMemo(() => {
    return vendors.filter((vendor) => {
      const hay = `${vendor.name} ${vendor.category} ${vendor.owner} ${vendor.businessUnit}`.toLowerCase()
      if (q && !hay.includes(q.toLowerCase())) return false
      if (tier !== "all" && vendor.tier !== tier) return false
      if (status !== "all" && vendor.status !== status) return false
      return true
    })
  }, [vendors, q, tier, status])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Inventory</p>
          <h1 className="text-2xl font-semibold tracking-tight">Vendors</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} in view · residual and ratings move with the live monitoring feed
          </p>
        </div>
        <Button asChild>
          <Link to="/intake">Onboard a vendor</Link>
        </Button>
      </div>

      <Surface className="p-3">
        <div className="mb-3 flex flex-wrap gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, owner, category"
            className="max-w-xs"
          />
          <Select value={tier} onValueChange={setTier}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Tier" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="all">All tiers</SelectItem>
              {(["critical", "high", "moderate", "low"] as RiskTier[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="all">All statuses</SelectItem>
              {(["intake", "assessment", "remediation", "monitoring", "approved", "offboarding"] as VendorStatus[]).map(
                (s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Inherent</TableHead>
              <TableHead>Residual</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Next review</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!ready && rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="px-4 py-10 text-sm text-muted-foreground">
                  Loading the register from Firestore…
                </TableCell>
              </TableRow>
            ) : null}
            {ready && loadError && rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="px-4 py-10 text-sm text-risk-critical">
                  Could not load vendors. {loadError}
                </TableCell>
              </TableRow>
            ) : null}
            {ready && !loadError && rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="px-4 py-10 text-sm text-muted-foreground">
                  The register is empty. Refresh the page to seed Northline vendors, or onboard one from Intake.
                </TableCell>
              </TableRow>
            ) : null}
            {rows.map((vendor) => {
              const fresh = vendor.updatedAt ? now - new Date(vendor.updatedAt).getTime() < 8_000 : false
              return (
              <TableRow key={vendor.id} className={cn("cursor-pointer", fresh && "bg-primary/[0.04]")}>
                <TableCell>
                  <Link to={`/vendors/${vendor.id}`} className="block">
                    <span className="font-medium">{vendor.name}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {vendor.category} · {vendor.businessUnit}
                      {fresh ? <span className="ml-2 text-[10px] font-semibold text-primary">LIVE</span> : null}
                    </span>
                  </Link>
                </TableCell>
                <TableCell>
                  <TierMark tier={vendor.tier} />
                </TableCell>
                <TableCell className="text-base font-semibold tabular-nums">{vendor.inherent}</TableCell>
                <TableCell className="text-base font-semibold">
                  <LiveNumber value={vendor.residual} tone="risk" />
                </TableCell>
                <TableCell className="text-base font-semibold">
                  <LiveNumber value={vendor.securityRating} tone="score" />
                </TableCell>
                <TableCell className="font-mono text-xs">{vendor.dataClasses.join(" · ")}</TableCell>
                <TableCell>{vendor.owner}</TableCell>
                <TableCell>{formatDate(vendor.nextReview)}</TableCell>
                <TableCell>
                  <StatusChip status={vendor.status} />
                </TableCell>
              </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Surface>
    </div>
  )
}
