import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Surface } from "@/components/marks"
import type { UserRole } from "@/types"

const permissions = [
  { id: "register", label: "Vendor register" },
  { id: "intake", label: "Launch intake" },
  { id: "assess", label: "Score assessments" },
  { id: "watch", label: "Acknowledge alerts" },
  { id: "findings", label: "Close findings" },
  { id: "reports", label: "Export CRO pack" },
  { id: "users", label: "Manage users" },
  { id: "policy", label: "Edit SLA policy" },
  { id: "portal", label: "Vendor portal" },
] as const

const matrix: Record<UserRole, Record<(typeof permissions)[number]["id"], boolean>> = {
  admin: {
    register: true,
    intake: false,
    assess: false,
    watch: false,
    findings: false,
    reports: true,
    users: true,
    policy: true,
    portal: false,
  },
  infosec: {
    register: true,
    intake: true,
    assess: true,
    watch: true,
    findings: true,
    reports: true,
    users: false,
    policy: false,
    portal: false,
  },
  vendor: {
    register: false,
    intake: false,
    assess: false,
    watch: false,
    findings: false,
    reports: false,
    users: false,
    policy: false,
    portal: true,
  },
}

const roles: UserRole[] = ["admin", "infosec", "vendor"]

export function AdminAccess() {
  const [grid, setGrid] = useState(matrix)

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Entitlements</p>
        <h1 className="text-2xl font-semibold tracking-tight">Access</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Role matrix for this tenant. Changes apply on save — dummy policy store.
        </p>
      </div>
      <Surface className="overflow-x-auto p-5">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="pb-3 font-medium">Capability</th>
              {roles.map((role) => (
                <th key={role} className="pb-3 font-medium capitalize">
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissions.map((perm) => (
              <tr key={perm.id} className="border-t border-border">
                <td className="py-2.5">{perm.label}</td>
                {roles.map((role) => (
                  <td key={role} className="py-2.5">
                    <input
                      type="checkbox"
                      checked={grid[role][perm.id]}
                      onChange={(event) =>
                        setGrid((prev) => ({
                          ...prev,
                          [role]: { ...prev[role], [perm.id]: event.target.checked },
                        }))
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <Button className="mt-4" onClick={() => toast.success("Access matrix published to the tenant.")}>
          Save matrix
        </Button>
      </Surface>
    </div>
  )
}
