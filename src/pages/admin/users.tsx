import { useMemo, useState } from "react"
import { toast } from "sonner"
import { roleLabel } from "@/data/accounts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Surface } from "@/components/marks"
import { cn } from "cn"
import { useTprm } from "@/state/tprm-store"
import type { UserRole } from "@/types"

type DirectoryFilter = "all" | "infosec" | "vendor"

const filters: { id: DirectoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "infosec", label: "InfoSec" },
  { id: "vendor", label: "Vendors" },
]

export function AdminUsers() {
  const { users, vendors, addDirectoryUser } = useTprm()
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [vendorId, setVendorId] = useState("")
  const [role, setRole] = useState<UserRole>("infosec")
  const [filter, setFilter] = useState<DirectoryFilter>("all")
  const [saving, setSaving] = useState(false)

  const rows = useMemo(
    () => (filter === "all" ? users : users.filter((account) => account.role === filter)),
    [users, filter],
  )

  async function addUser() {
    const nextName = name.trim()
    const nextEmail = email.trim().toLowerCase()
    if (!nextName || !nextEmail) {
      toast.error("Name and email are required.")
      return
    }
    if (role === "vendor" && !vendorId) {
      toast.error("Pick the vendor this login belongs to.")
      return
    }
    setSaving(true)
    try {
      await addDirectoryUser({
        name: nextName,
        email: nextEmail,
        role,
        vendorId: role === "vendor" ? vendorId : undefined,
      })
      toast.success(`${nextName} added as ${roleLabel[role]}. Password is demo123.`)
      setEmail("")
      setName("")
      setVendorId("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add user.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Directory</p>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Directory lives in Firestore. Sign-in password is{" "}
          <span className="font-medium text-foreground">demo123</span>.
        </p>
      </div>

      <Surface className="p-5">
        <h2 className="text-lg font-semibold tracking-tight">Add user</h2>
        <form
          className="mt-3 flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            void addUser()
          }}
        >
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Full name"
            className="max-w-48"
          />
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="work email"
            className="max-w-64"
          />
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as UserRole)}
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
          >
            <option value="infosec">InfoSec</option>
            <option value="vendor">Vendor</option>
            <option value="admin">Admin</option>
          </select>
          {role === "vendor" ? (
            <Select value={vendorId || undefined} onValueChange={setVendorId}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Vendor on the register" />
              </SelectTrigger>
              <SelectContent position="popper">
                {vendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Button type="submit" disabled={saving}>
            {saving ? "Adding…" : "Add user"}
          </Button>
        </form>
      </Surface>

      <Surface className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filter === item.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
              <span className="ml-1.5 tabular-nums opacity-70">
                {item.id === "all"
                  ? users.length
                  : users.filter((account) => account.role === item.id).length}
              </span>
            </button>
          ))}
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Scope</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((account) => (
              <tr key={account.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3">
                  <p className="font-medium">{account.name}</p>
                  <p className="text-xs text-muted-foreground">{account.title}</p>
                </td>
                <td className="px-5 py-3 font-mono text-xs">{account.email}</td>
                <td className="px-5 py-3">{roleLabel[account.role]}</td>
                <td className="px-5 py-3 text-muted-foreground">
                  {account.vendorName ? `${account.vendorName}` : "Northline"}
                  {account.vendorId ? (
                    <span className="block font-mono text-[11px]">{account.vendorId}</span>
                  ) : null}
                </td>
                <td className="px-5 py-3 text-risk-low">{account.active ? "Active" : "Inactive"}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-sm text-muted-foreground">
                  No users in this filter. Add one above.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Surface>
    </div>
  )
}
