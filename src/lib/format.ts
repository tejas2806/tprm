import type { FindingStatus, RiskTier, VendorStatus } from "@/types"

export function tierLabel(tier: RiskTier) {
  return tier[0]!.toUpperCase() + tier.slice(1)
}

export function statusLabel(status: VendorStatus | FindingStatus) {
  return status.replaceAll("_", " ")
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso))
}

export function daysUntil(iso: string, now = Date.now()) {
  const ms = new Date(iso).getTime() - now
  return Math.ceil(ms / 86_400_000)
}

export function slaRemainingMs(opened: string, slaDays: number, now = Date.now()) {
  return new Date(opened).getTime() + slaDays * 86_400_000 - now
}

export function remainingSlaDays(opened: string, slaDays: number, now = Date.now()) {
  return Math.ceil(slaRemainingMs(opened, slaDays, now) / 86_400_000)
}

export function formatSlaClock(opened: string, slaDays: number, now = Date.now()) {
  const ms = slaRemainingMs(opened, slaDays, now)
  const overdue = ms < 0
  const abs = Math.abs(ms)
  const days = Math.floor(abs / 86_400_000)
  const hours = Math.floor((abs % 86_400_000) / 3_600_000)
  const mins = Math.floor((abs % 3_600_000) / 60_000)
  const clock =
    days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${mins}m` : `${Math.max(1, mins)}m`
  return overdue ? `${clock} overdue` : clock
}

export function relativeTime(iso: string, now = Date.now()) {
  const delta = Math.round((now - new Date(iso).getTime()) / 1000)
  if (delta < 8) return "just now"
  if (delta < 60) return `${delta}s ago`
  const mins = Math.floor(delta / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function formatTime(now = Date.now()) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now)
}

export function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}
