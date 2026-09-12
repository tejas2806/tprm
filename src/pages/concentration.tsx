import { Link } from "react-router-dom"
import { Surface } from "@/components/marks"
import { relativeTime } from "@/lib/format"
import { useTprm } from "@/state/tprm-store"

type Node = { id: string; label: string; x: number; y: number; kind: "bank" | "vendor" | "fourth" }

export function ConcentrationPage() {
  const { now, lastIngestAt, vendors } = useTprm()
  const counts = new Map<string, number>()
  for (const vendor of vendors) {
    for (const sub of vendor.subprocessors) {
      counts.set(sub, (counts.get(sub) ?? 0) + 1)
    }
  }
  const fourth = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const materialOnAws = vendors.filter(
    (v) => v.subprocessors.includes("AWS") && (v.tier === "critical" || v.tier === "high"),
  )

  const nodes: Node[] = [
    { id: "bank", label: "Northline", x: 360, y: 210, kind: "bank" },
    { id: "aws", label: "AWS", x: 140, y: 80, kind: "fourth" },
    { id: "cf", label: "Cloudflare", x: 580, y: 70, kind: "fourth" },
    { id: "tw", label: "Twilio", x: 640, y: 280, kind: "fourth" },
    { id: "h", label: "HelixPay", x: 240, y: 300, kind: "vendor" },
    { id: "v", label: "VaultKey", x: 460, y: 320, kind: "vendor" },
    { id: "p", label: "PulseComms", x: 500, y: 160, kind: "vendor" },
    { id: "n", label: "Northstar", x: 200, y: 160, kind: "vendor" },
  ]

  const edges: [string, string][] = [
    ["bank", "h"],
    ["bank", "v"],
    ["bank", "p"],
    ["bank", "n"],
    ["h", "aws"],
    ["h", "cf"],
    ["h", "tw"],
    ["v", "aws"],
    ["v", "cf"],
    ["p", "tw"],
    ["p", "aws"],
    ["n", "aws"],
  ]

  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]))

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Fourth party</p>
        <h1 className="text-2xl font-semibold tracking-tight">Fourth-party concentration</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Shared subprocessors hide systemic risk. A single AWS region event would touch{" "}
          {materialOnAws.length} material vendors at once. Graph last reconciled{" "}
          {relativeTime(new Date(lastIngestAt).toISOString(), now)}.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <Surface className="overflow-hidden p-2">
          <svg viewBox="0 0 720 400" className="h-auto w-full">
            {edges.map(([a, b]) => {
              const from = byId[a]
              const to = byId[b]
              if (!from || !to) return null
              const hot = a === "aws" || b === "aws"
              return (
                <line
                  key={`${a}-${b}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={hot ? "var(--primary)" : "currentColor"}
                  className={hot ? "" : "text-foreground/20"}
                  strokeWidth={hot ? 1.8 : 1}
                />
              )
            })}
            {nodes.map((node) => (
              <g key={node.id} transform={`translate(${node.x},${node.y})`}>
                <circle
                  r={node.kind === "bank" ? 28 : 18}
                  fill={
                    node.kind === "fourth"
                      ? "var(--primary)"
                      : node.kind === "bank"
                        ? "var(--signal)"
                        : "var(--card)"
                  }
                  stroke="var(--foreground)"
                  strokeOpacity={0.2}
                />
                <text
                  y={node.kind === "bank" ? 48 : 34}
                  textAnchor="middle"
                  fill="currentColor"
                  className="text-[11px]"
                >
                  {node.label}
                </text>
              </g>
            ))}
          </svg>
        </Surface>
        <div className="space-y-3">
          {fourth.map(([name, n]) => (
            <Surface key={name} className="p-4">
              <p className="text-sm font-medium">{name}</p>
              <p className="text-2xl font-semibold tabular-nums tracking-tight">{n}</p>
              <p className="text-xs text-muted-foreground">vendors share this subprocessor</p>
            </Surface>
          ))}
        </div>
      </div>

      <Surface className="p-5">
        <h2 className="text-lg font-semibold tracking-tight">Material vendors on AWS</h2>
        <ul className="mt-3 divide-y divide-border">
          {materialOnAws.map((vendor) => (
            <li key={vendor.id} className="flex items-center justify-between py-2 text-sm">
              <Link to={`/vendors/${vendor.id}`} className="hover:text-primary">
                {vendor.name}
              </Link>
              <span className="text-muted-foreground">{vendor.category}</span>
            </li>
          ))}
        </ul>
      </Surface>
    </div>
  )
}
