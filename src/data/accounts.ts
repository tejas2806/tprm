import type { SessionUser, UserRole } from "@/types"

export type DemoAccount = SessionUser & { password: string }

export const demoAccounts: DemoAccount[] = [
  {
    id: "usr_admin",
    email: "admin@northline.example",
    password: "demo123",
    name: "Priya Menon",
    title: "TPRM platform admin",
    role: "admin",
  },
  {
    id: "usr_infosec",
    email: "suyog@northline.example",
    password: "demo123",
    name: "Suyog Khairnar",
    title: "Sr. Third-Party Risk",
    role: "infosec",
  },
  {
    id: "usr_infosec_mei",
    email: "mei.chen@northline.example",
    password: "demo123",
    name: "Mei Chen",
    title: "Vendor risk analyst",
    role: "infosec",
  },
  {
    id: "usr_vendor_helix",
    email: "ava.quinn@helixpay.example",
    password: "demo123",
    name: "Ava Quinn",
    title: "CISO, HelixPay",
    role: "vendor",
    vendorId: "vnd_helix",
    vendorName: "HelixPay",
  },
  {
    id: "usr_vendor_drift",
    email: "ivy.cho@drift.example",
    password: "demo123",
    name: "Ivy Cho",
    title: "Trust, Drift Analytics",
    role: "vendor",
    vendorId: "vnd_drift",
    vendorName: "Drift Analytics",
  },
]

export const roleHome: Record<UserRole, string> = {
  admin: "/admin",
  infosec: "/",
  vendor: "/vendor",
}

export const roleLabel: Record<UserRole, string> = {
  admin: "Admin",
  infosec: "InfoSec",
  vendor: "Vendor",
}

export function toSession(account: DemoAccount): SessionUser {
  return {
    id: account.id,
    email: account.email,
    name: account.name,
    title: account.title,
    role: account.role,
    vendorId: account.vendorId,
    vendorName: account.vendorName,
  }
}

export function findAccount(email: string, password: string) {
  const account = profileFromEmail(email)
  return account && account.password === password ? account : undefined
}

export function profileFromEmail(email: string) {
  const needle = email.trim().toLowerCase()
  return demoAccounts.find((account) => account.email.toLowerCase() === needle)
}
