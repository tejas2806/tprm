import { useEffect, useState, type ComponentType } from "react"
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
  Users,
  KeyRound,
  Scroll,
  History,
  Upload,
  LogOut,
} from "lucide-react"
import { cn } from "cn"
import { formatTime, initials, relativeTime } from "@/lib/format"
import { roleLabel } from "@/data/accounts"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SignalTicker } from "@/components/signal-ticker"
import { PageEnter } from "@/components/page-enter"
import { AegisMark } from "@/components/aegis-mark"
import { useTprm } from "@/state/tprm-store"
import { homeFor, useAuth } from "@/state/auth"
import type { UserRole } from "@/types"

type NavItem = {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  end?: boolean
  badge?: "alerts" | "findings"
}

const navByRole: Record<UserRole, NavItem[]> = {
  infosec: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/vendors", label: "Vendors", icon: Building2 },
    { to: "/intake", label: "Intake", icon: FilePlus2 },
    { to: "/assessments", label: "Assessments", icon: ClipboardCheck },
    { to: "/watchtower", label: "Monitoring", icon: Radar, badge: "alerts" },
    { to: "/findings", label: "Findings", icon: ShieldAlert, badge: "findings" },
    { to: "/concentration", label: "Fourth parties", icon: Share2 },
    { to: "/questionnaires", label: "Questionnaires", icon: FileStack },
    { to: "/reports", label: "Reports", icon: ScrollText },
  ],
  admin: [
    { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
    { to: "/admin/users", label: "Users", icon: Users },
    { to: "/admin/access", label: "Access", icon: KeyRound },
    { to: "/admin/policies", label: "Policies", icon: Scroll },
    { to: "/admin/audit", label: "Audit", icon: History },
  ],
  vendor: [
    { to: "/vendor", label: "Home", icon: LayoutDashboard, end: true },
    { to: "/vendor/questionnaire", label: "Questionnaire", icon: ClipboardCheck },
    { to: "/vendor/findings", label: "Findings", icon: ShieldAlert, badge: "findings" },
    { to: "/vendor/evidence", label: "Evidence", icon: Upload },
  ],
}

const productLine: Record<UserRole, string> = {
  infosec: "Third-party risk",
  admin: "Tenant admin",
  vendor: "Vendor portal",
}

export function RoleShell({ role }: { role: UserRole }) {
  const { user, logout } = useAuth()
  const { now, lastIngestAt, signals, vendors, assessments, findings } = useTprm()
  const [open, setOpen] = useState(false)
  const [hotkey, setHotkey] = useState("Ctrl K")
  const navigate = useNavigate()
  const { resolvedTheme, setTheme } = useTheme()
  const nav = navByRole[role]
  const live = signals.filter((s) => !s.acked).length
  const scopedFindings = findings.filter((f) => {
    if (f.status !== "open" && f.status !== "in_progress") return false
    if (role === "vendor") return f.vendorId === user?.vendorId
    return true
  }).length

  useEffect(() => {
    const mac = navigator.platform.toLowerCase().includes("mac")
    setHotkey(mac ? "⌘K" : "Ctrl K")
  }, [])

  useEffect(() => {
    if (role === "vendor") return
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [role])

  if (!user) return null

  return (
    <div className="flex min-h-svh">
      <aside className="sticky top-0 flex h-svh w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <Link to={homeFor(user)} className="flex items-center gap-2.5 px-4 py-4">
          <span className="grid size-8 place-items-center rounded-md bg-white/10 text-sidebar-foreground">
            <AegisMark className="size-4" />
          </span>
          <span>
            <span className="block text-[15px] font-semibold tracking-tight text-sidebar-foreground">
              Aegis
            </span>
            <span className="text-[11px] text-sidebar-foreground/55">{productLine[role]}</span>
          </span>
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5 px-2">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                )
              }
            >
              <item.icon className="size-4 opacity-80" />
              {item.label}
              {item.badge === "alerts" && live > 0 ? (
                <span className="ml-auto text-[11px] font-medium tabular-nums text-red-300">
                  {live}
                </span>
              ) : null}
              {item.badge === "findings" && scopedFindings > 0 ? (
                <span className="ml-auto text-[11px] font-medium tabular-nums text-sidebar-primary">
                  {scopedFindings}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>
        <div className="m-2 rounded-md border border-sidebar-border bg-white/5 p-3">
          <p className="text-[11px] font-medium text-sidebar-foreground/50">
            {role === "vendor" ? "Buyer" : "Tenant"}
          </p>
          <p className="mt-0.5 text-sm font-medium text-sidebar-foreground">Northline Bank</p>
          <p className="text-xs text-sidebar-foreground/55">
            {role === "vendor" ? user.vendorName : `${roleLabel[role]} · FY26 Q3`}
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-border bg-card px-5">
          {role === "vendor" ? (
            <p className="text-sm text-muted-foreground">
              Requests from Northline · {user.vendorName}
            </p>
          ) : (
            <Button
              variant="outline"
              className="min-w-64 justify-start text-muted-foreground"
              onClick={() => setOpen(true)}
            >
              <Search data-icon="inline-start" />
              {role === "admin" ? "Search users and policies" : "Search vendors, findings, assessments"}
              <kbd className="ml-auto font-mono text-[10px] text-muted-foreground">{hotkey}</kbd>
            </Button>
          )}
          <div className="ml-auto flex items-center gap-3">
            {role !== "vendor" ? (
              <div className="hidden items-center gap-2 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs sm:flex">
                <span className="size-1.5 rounded-full bg-risk-low motion-safe:soft-pulse" />
                <span className="font-medium text-risk-low">Live</span>
                <span className="tabular-nums text-muted-foreground">{formatTime(now)}</span>
                <span className="hidden text-muted-foreground xl:inline">
                  · ingest {relativeTime(new Date(lastIngestAt).toISOString(), now)}
                </span>
              </div>
            ) : (
              <div className="hidden items-center gap-2 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs sm:flex">
                <span className="size-1.5 rounded-full bg-risk-low motion-safe:soft-pulse" />
                <span className="font-medium text-risk-low">Portal live</span>
                <span className="tabular-nums text-muted-foreground">{formatTime(now)}</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="transition-transform duration-200 hover:rotate-12"
            >
              {resolvedTheme === "light" ? <Moon /> : <Sun />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-[11px] text-muted-foreground">{user.title}</p>
                </div>
                <Avatar size="sm">
                  <AvatarFallback>{initials(user.name)}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  {roleLabel[user.role]}
                  <span className="mt-0.5 block font-normal text-muted-foreground">{user.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    logout()
                    navigate("/login", { replace: true })
                  }}
                >
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        {role === "infosec" ? <SignalTicker signals={signals} /> : null}
        <main className="flex-1 px-6 py-5 lg:px-8">
          <PageEnter>
            <Outlet />
          </PageEnter>
        </main>
      </div>

      {role !== "vendor" ? (
        <CommandDialog open={open} onOpenChange={setOpen}>
          <Command>
            <CommandInput placeholder={role === "admin" ? "Users, policies…" : "Vendors, assessments, findings…"} />
            <CommandList>
              <CommandEmpty>Nothing matches.</CommandEmpty>
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
              {role === "infosec" ? (
                <>
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
                </>
              ) : null}
            </CommandList>
          </Command>
        </CommandDialog>
      ) : null}
    </div>
  )
}
