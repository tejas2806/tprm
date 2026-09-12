import { Link, Navigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { RiskDna, ScoreRing, StatusChip, Surface, TierMark } from "@/components/marks"
import { formatDate, relativeTime } from "@/lib/format"
import { LiveNumber } from "@/components/live-number"
import { useTprm } from "@/state/tprm-store"

export function VendorDossier() {
  const { id } = useParams()
  const { now, vendors, assessments, findings, signals } = useTprm()
  const vendor = vendors.find((item) => item.id === id)
  if (!vendor) return <Navigate to="/vendors" replace />

  const relatedAssess = assessments.filter((a) => a.vendorId === vendor.id)
  const relatedFindings = findings.filter((f) => f.vendorId === vendor.id)
  const relatedSignals = signals.filter((s) => s.vendorId === vendor.id)

  return (
    <div className="space-y-5">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/vendors">Vendors</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{vendor.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Surface className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-6 p-6">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {vendor.id}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">{vendor.name}</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">{vendor.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <TierMark tier={vendor.tier} />
              <StatusChip status={vendor.status} />
              <span className="rounded-md bg-muted px-2 py-1 text-xs">{vendor.category}</span>
              <span className="rounded-md bg-muted px-2 py-1 text-xs">{vendor.hosting}</span>
            </div>
          </div>
          <div className="flex gap-6">
            <ScoreRing value={vendor.inherent} label="Inherent" />
            <ScoreRing value={vendor.residual} label="Residual" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
          {[
            ["Owner", vendor.owner],
            ["Business", vendor.businessUnit],
            ["Spend", vendor.spend],
            ["Rating", vendor.securityRating],
            ["Contract", formatDate(vendor.contractEnd)],
            ["Last assessed", formatDate(vendor.lastAssessed)],
            ["Next review", formatDate(vendor.nextReview)],
            ["Site", vendor.website],
          ].map(([k, v]) => (
            <div key={k} className="bg-card px-5 py-3">
              <p className="text-xs text-muted-foreground">{k}</p>
              <p className="text-sm font-medium">
                {k === "Rating" ? <LiveNumber value={Number(v)} tone="score" /> : v}
              </p>
            </div>
          ))}
        </div>
      </Surface>

      <Tabs defaultValue="overview">
        <TabsList variant="line">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="controls">Controls</TabsTrigger>
          <TabsTrigger value="work">Work</TabsTrigger>
          <TabsTrigger value="offboard">Offboarding</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4 grid gap-4 lg:grid-cols-2">
          <Surface className="p-5">
            <h2 className="text-lg font-semibold tracking-tight">Inherent DNA</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Why this third party is material — before they show you a SOC 2.
            </p>
            <RiskDna dna={vendor.inherentDna} />
          </Surface>
          <Surface className="p-5">
            <h2 className="text-lg font-semibold tracking-tight">Data & geos</h2>
            <p className="mt-3 text-sm">
              <span className="text-muted-foreground">Classes · </span>
              {vendor.dataClasses.join(", ")}
            </p>
            <p className="mt-2 text-sm">
              <span className="text-muted-foreground">Geos · </span>
              {vendor.geos.join(", ")}
            </p>
            <p className="mt-2 text-sm">
              <span className="text-muted-foreground">Subprocessors · </span>
              {vendor.subprocessors.join(", ") || "None recorded"}
            </p>
            <div className="mt-4 space-y-2">
              {vendor.contacts.map((c) => (
                <p key={c.email} className="text-sm">
                  {c.name} · {c.role}
                  <span className="block font-mono text-xs text-muted-foreground">{c.email}</span>
                </p>
              ))}
            </div>
          </Surface>
        </TabsContent>
        <TabsContent value="controls" className="mt-4">
          <Surface className="p-5">
            <h2 className="mb-3 text-lg font-semibold tracking-tight">Evidence vault</h2>
            {vendor.certifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No certificates on file — intake should request SOC 2 or ISO.</p>
            ) : (
              <ul className="divide-y divide-border">
                {vendor.certifications.map((cert) => (
                  <li key={cert.name} className="flex items-center justify-between py-3">
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
        </TabsContent>
        <TabsContent value="work" className="mt-4 grid gap-4 lg:grid-cols-2">
          <Surface className="p-5">
            <h2 className="mb-3 text-lg font-semibold tracking-tight">Assessments</h2>
            <ul className="space-y-2">
              {relatedAssess.map((a) => (
                <li key={a.id}>
                  <Link to={`/assessments/${a.id}`} className="text-sm hover:text-primary">
                    {a.template} · {a.stage} · due {formatDate(a.due)}
                  </Link>
                </li>
              ))}
              {relatedAssess.length === 0 ? (
                <p className="text-sm text-muted-foreground">No live assessment.</p>
              ) : null}
            </ul>
            <h2 className="mt-6 mb-3 text-lg font-semibold tracking-tight">Findings</h2>
            <ul className="space-y-2">
              {relatedFindings.map((f) => (
                <li key={f.id} className="text-sm">
                  {f.title}
                  <span className="ml-2 text-xs text-muted-foreground">{f.status}</span>
                </li>
              ))}
            </ul>
          </Surface>
          <Surface className="p-5">
            <h2 className="mb-3 text-lg font-semibold tracking-tight">Signals</h2>
            <ul className="space-y-3">
              {relatedSignals.map((s) => (
                <li key={s.id}>
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.detail}</p>
                  <p className="text-[11px] text-muted-foreground">{relativeTime(s.at, now)}</p>
                </li>
              ))}
              {relatedSignals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Watchtower is quiet for this vendor.</p>
              ) : null}
            </ul>
          </Surface>
        </TabsContent>
        <TabsContent value="offboard" className="mt-4">
          <Surface className="p-5">
            <h2 className="text-lg font-semibold tracking-tight">Offboarding checklist</h2>
            <p className="mt-1 mb-4 text-sm text-muted-foreground">
              Used when a contract ends or a residual finding is unfixable.
            </p>
            <ul className="space-y-2 text-sm">
              {[
                "Revoke SSO / VPN / privileged accounts",
                "Confirm data destruction or return (DPA art. 28)",
                "Remove from payment rails and file transfers",
                "Notify business owner and legal",
                "Archive evidence vault for 7 years",
              ].map((item) => (
                <li key={item} className="rounded-lg bg-muted/50 px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => toast.message("Offboarding checklist opened. Legal and IAM will be notified.")}
            >
              Start offboarding
            </Button>
          </Surface>
        </TabsContent>
      </Tabs>
    </div>
  )
}
