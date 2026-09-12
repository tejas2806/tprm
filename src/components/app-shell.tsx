import { useEffect, useState } from "react"
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom"
import { useTheme } from "next-themes"
import {
  ClipboardCheck,
  FilePlus2,
  FileStack,
  LayoutDashboard,
  Moon,
  Radar,
  ScrollText,
  Search,
  Share2,
  ShieldAlert,
  Sun,
  Building2,
} from "lucide-react"
import { cn } from "cn"
import { formatTime, relativeTime } from "@/lib/format"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { SignalTicker } from "@/components/signal-ticker"
import { PageEnter } from "@/components/page-enter"
import { useTprm } from "@/state/tprm-store"

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/vendors", label: "Vendors", icon: Building2 },
  { to: "/intake", label: "Intake", icon: FilePlus2 },
  { to: "/assessments", label: "Assessments", icon: ClipboardCheck },
  { to: "/watchtower", label: "Monitoring", icon: Radar },
  { to: "/findings", label: "Findings", icon: ShieldAlert },
  { to: "/concentration", label: "Fourth parties", icon: Share2 },
  { to: "/questionnaires", label: "Questionnaires", icon: FileStack },
  { to: "/reports", label: "Reports", icon: ScrollText },
]

function AegisMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path
        d="M16 3.5 6 8.2v7.3c0 7.1 4.3 11.6 10 13 5.7-1.4 10-5.9 10-13V8.2L16 3.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M16 8v16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M10.5 14.5h11"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="16" cy="14.5" r="2.2" fill="currentColor" />
    </svg>
  )
}

export function AppShell() {
  const { now, lastIngestAt, signals, vendors, assessments, findings } = useTprm()
  const [open, setOpen] = useState(false)
  const [hotkey, setHotkey] = useState("Ctrl K")
  const navigate = useNavigate()
  const { resolvedTheme, setTheme } = useTheme()
  const live = signals.filter((s) => !s.acked).length
  const openFindings = findings.filter((f) => f.status === "open" || f.status === "in_progress").length

  useEffect(() => {
    const mac = navigator.platform.toLowerCase().includes("mac")
    setHotkey(mac ? "⌘K" : "Ctrl K")
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <div className="flex min-h-svh">
      <aside className="sticky top-0 flex h-svh w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <Link to="/" className="flex items-center gap-2.5 px-4 py-4">
          <span className="grid size-8 place-items-center rounded-md bg-white/10 text-sidebar-foreground">
            <AegisMark className="size-4" />
          </span>
          <span>
            <span className="block text-[15px] font-semibold tracking-tight text-sidebar-foreground">
              Aegis
            </span>
            <span className="text-[11px] text-sidebar-foreground/55">Third-party risk</span>
          </span>
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5 px-2">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive &&
                    "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                )
              }
            >
              <item.icon className="size-4 opacity-80" />
              {item.label}
              {item.to === "/watchtower" && live > 0 ? (
                <span className="ml-auto text-[11px] font-medium tabular-nums text-red-300">
                  {live}
                </span>
              ) : null}
              {item.to === "/findings" && openFindings > 0 ? (
                <span className="ml-auto text-[11px] font-medium tabular-nums text-sidebar-primary">
                  {openFindings}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>
        <div className="m-2 rounded-md border border-sidebar-border bg-white/5 p-3">
          <p className="text-[11px] font-medium text-sidebar-foreground/50">Tenant</p>
          <p className="mt-0.5 text-sm font-medium text-sidebar-foreground">Northline Bank</p>
          <p className="text-xs text-sidebar-foreground/55">InfoSec · FY26 Q3</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-border bg-card px-5">
          <Button
            variant="outline"
            className="min-w-64 justify-start text-muted-foreground"
            onClick={() => setOpen(true)}
          >
            <Search data-icon="inline-start" />
            Search vendors, findings, assessments
            <kbd className="ml-auto font-mono text-[10px] text-muted-foreground">{hotkey}</kbd>
          </Button>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs sm:flex">
              <span className="size-1.5 rounded-full bg-risk-low motion-safe:soft-pulse" />
              <span className="font-medium text-risk-low">Live</span>
              <span className="tabular-nums text-muted-foreground">{formatTime(now)}</span>
              <span className="text-muted-foreground">· ingest {relativeTime(new Date(lastIngestAt).toISOString(), now)}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="transition-transform duration-200 hover:rotate-12"
            >
              {resolvedTheme === "light" ? <Moon /> : <Sun />}
            </Button>
            <div className="hidden items-center gap-2 pr-1 sm:flex">
              <div className="text-right">
                <p className="text-sm font-medium">Suyog Khairnar</p>
                <p className="text-[11px] text-muted-foreground">Sr. Third-Party Risk</p>
              </div>
              <Avatar size="sm">
                <AvatarFallback>SK</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>
        <SignalTicker signals={signals} />
        <main className="flex-1 px-6 py-5 lg:px-8">
          <PageEnter>
            <Outlet />
          </PageEnter>
        </main>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          <CommandInput placeholder="Vendors, assessments, findings…" />
          <CommandList>
            <CommandEmpty>Nothing in the register matches.</CommandEmpty>
            <CommandGroup heading="Navigate">
              {nav.map((item) => (
                <CommandItem
                  key={item.to}
                  onSelect={() => {
                    navigate(item.to)
                    setOpen(false)
                  }}
                >
                  <item.icon />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Vendors">
              {vendors.map((vendor) => (
                <CommandItem
                  key={vendor.id}
                  onSelect={() => {
                    navigate(`/vendors/${vendor.id}`)
                    setOpen(false)
                  }}
                >
                  {vendor.name}
                  <span className="ml-auto text-xs text-muted-foreground">{vendor.category}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Assessments">
              {assessments.map((assessment) => (
                <CommandItem
                  key={assessment.id}
                  onSelect={() => {
                    navigate(`/assessments/${assessment.id}`)
                    setOpen(false)
                  }}
                >
                  {assessment.vendorName}
                  <span className="ml-auto text-xs text-muted-foreground">{assessment.stage}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </div>
  )
}
