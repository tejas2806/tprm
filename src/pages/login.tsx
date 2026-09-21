import { useEffect, useState, type FormEvent } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { useTheme } from "next-themes"
import {
  ArrowRight,
  BarChart3,
  Building2,
  ChevronDown,
  Eye,
  EyeOff,
  FileText,
  Globe,
  Lock,
  Mail,
  Moon,
  Shield,
  Sun,
  Users,
} from "lucide-react"
import { formatAuthError, homeFor, useAuth } from "@/state/auth"
import { isFirebaseConfigured } from "@/lib/firebase"
import { cn } from "cn"
import type { UserRole } from "@/types"

const roles: {
  role: UserRole
  email: string
  title: string
  blurb: string
  icon: typeof Shield
  iconWrap: string
}[] = [
  {
    role: "infosec",
    email: "suyog@northline.example",
    title: "InfoSec",
    blurb: "Risk operations, monitoring, and residual.",
    icon: Shield,
    iconWrap: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
  },
  {
    role: "admin",
    email: "admin@northline.example",
    title: "Admin",
    blurb: "Users, access, and tenant policy.",
    icon: Users,
    iconWrap: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  {
    role: "vendor",
    email: "ava.quinn@helixpay.example",
    title: "Vendor",
    blurb: "Questionnaires, findings, and evidence.",
    icon: Building2,
    iconWrap: "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
  },
]

const features = [
  { icon: Shield, title: "Assess Risk", copy: "Evaluate third-party risk with confidence" },
  { icon: BarChart3, title: "Drive Compliance", copy: "Meet regulatory requirements easily" },
  { icon: Users, title: "Continuous Monitoring", copy: "Stay informed, always" },
  { icon: FileText, title: "Stronger Relationships", copy: "Enable trust and transparency" },
]

const reviews = [
  {
    text: "TPRM has transformed how we manage third-party risks. It’s intuitive, powerful and built for the real world.",
    by: "Risk & Compliance Leader",
  },
  {
    text: "One register for residual, access, and vendor responses. The desks finally see the same file.",
    by: "Head of Third-Party Risk",
  },
  {
    text: "Vendors answer in their portal. InfoSec closes residual. Admin stays out of the queue.",
    by: "CISO, Northline Bank",
  },
  {
    text: "Watchtower and the SLA clocks keep the queue honest. We stopped chasing status in email.",
    by: "Vendor Risk Analyst",
  },
]

function ReviewCarousel() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % reviews.length)
    }, 5200)
    return () => window.clearInterval(id)
  }, [paused])

  return (
    <div
      className="mt-10 max-w-[520px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur-md">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {reviews.map((review) => (
            <figure key={review.by} className="min-w-full shrink-0 basis-full px-5 py-4">
              <p className="min-h-[72px] text-[15px] leading-6 text-white/90">“{review.text}”</p>
              <figcaption className="mt-2 text-[13px] text-white/60">— {review.by}</figcaption>
            </figure>
          ))}
        </div>
      </div>
      <div className="mt-5 flex gap-1.5">
        {reviews.map((review, dot) => (
          <button
            key={review.by}
            type="button"
            aria-label={`Review ${dot + 1}`}
            onClick={() => setIndex(dot)}
            className={cn(
              "size-1.5 rounded-full transition-colors",
              dot === index ? "bg-white" : "bg-white/35 hover:bg-white/55",
            )}
          />
        ))}
      </div>
    </div>
  )
}

function TprmMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path
        d="M16 3.2 5.5 7.4v8.1c0 7.4 4.6 12.3 10.5 13.8 5.9-1.5 10.5-6.4 10.5-13.8V7.4L16 3.2Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function LoginPage() {
  const { user, ready, login } = useAuth()
  const navigate = useNavigate()
  const { resolvedTheme, setTheme } = useTheme()
  const [role, setRole] = useState<UserRole>("infosec")
  const [email, setEmail] = useState(roles[0]!.email)
  const [password, setPassword] = useState("demo123")
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [hint, setHint] = useState("")

  if (ready && user) return <Navigate to={homeFor(user)} replace />

  function pickRole(next: (typeof roles)[number]) {
    setRole(next.role)
    setEmail(next.email)
    setPassword("demo123")
    setError("")
  }

  async function enter(event?: FormEvent) {
    event?.preventDefault()
    setBusy(true)
    setError("")
    try {
      const session = await login(email, password)
      if (!session) {
        setError("Email or password is incorrect.")
        return
      }
      navigate(homeFor(session), { replace: true })
    } catch (err) {
      setError(formatAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-svh bg-white lg:grid-cols-2 dark:bg-background">
      <section className="relative hidden min-h-svh overflow-hidden text-white lg:flex">
        <img
          src="/login-hero.png"
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-[#061226]/55" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#061226]/80 via-[#061226]/25 to-[#061226]/40" />

        <div className="relative flex w-full flex-col px-10 py-8 xl:px-14">
          <header className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <TprmMark className="size-7 text-white" />
              <div>
                <p className="text-[22px] leading-none font-semibold tracking-tight">TPRM</p>
                <p className="mt-1 text-[11px] tracking-wide text-white/70">
                  Third-Party Risk Management
                </p>
              </div>
            </div>
            <nav className="pt-2 text-[11px] font-medium tracking-[0.22em] text-white/70">
              TRUST<span className="mx-2.5 text-white/35">|</span>
              GOVERN<span className="mx-2.5 text-white/35">|</span>
              MONITOR<span className="mx-2.5 text-white/35">|</span>
              GROW
            </nav>
          </header>

          <div className="my-auto max-w-[560px] pt-8">
            <h1 className="text-[56px] leading-[1.05] font-semibold tracking-tight xl:text-[64px]">
              Stronger
              <br />
              <span className="text-[#3b82f6]">Partners.</span>
              <br />
              Safer <span className="text-[#3b82f6]">Tomorrow.</span>
            </h1>
            <p className="mt-6 max-w-[460px] text-[15px] leading-7 text-white/80">
              A comprehensive Third-Party Risk Management platform to help organisations
              identify, assess, monitor and mitigate risks across their extended ecosystem.
            </p>

            <div className="mt-10 grid grid-cols-4 gap-5">
              {features.map((item) => (
                <div key={item.title}>
                  <span className="grid size-10 place-items-center rounded-full bg-white/12 ring-1 ring-white/15">
                    <item.icon className="size-4" />
                  </span>
                  <p className="mt-3 text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-[12px] leading-5 text-white/65">{item.copy}</p>
                </div>
              ))}
            </div>

            <ReviewCarousel />
          </div>

          <footer className="flex items-center justify-between pt-6 text-[11px] text-white/55">
            <p>© 2026 TPRM. All rights reserved.</p>
            <div className="flex gap-5">
              <span>Security</span>
              <span>Privacy</span>
              <span>Terms</span>
              <span>Contact</span>
            </div>
          </footer>
        </div>
      </section>

      <section className="flex flex-col px-6 py-6 sm:px-10 lg:px-14">
        <div className="mb-6 flex items-center justify-between lg:justify-end">
          <div className="flex items-center gap-2 lg:hidden">
            <TprmMark className="size-6 text-[#2563eb]" />
            <span className="font-semibold">TPRM</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-full bg-muted p-0.5">
              <button
                type="button"
                aria-label="Light theme"
                onClick={() => setTheme("light")}
                className={cn(
                  "grid size-7 place-items-center rounded-full",
                  resolvedTheme === "light" && "bg-white shadow-sm dark:bg-card",
                )}
              >
                <Sun className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label="Dark theme"
                onClick={() => setTheme("dark")}
                className={cn(
                  "grid size-7 place-items-center rounded-full",
                  resolvedTheme === "dark" && "bg-white shadow-sm dark:bg-card",
                )}
              >
                <Moon className="size-3.5" />
              </button>
            </div>
            <button type="button" className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Globe className="size-4" />
              English
              <ChevronDown className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center">
          <h2 className="text-[32px] leading-tight font-semibold tracking-tight">Welcome to TPRM</h2>
          <p className="mt-2 text-[15px] text-muted-foreground">Sign in to access your workspace.</p>

          <form className="mt-8 space-y-3" onSubmit={enter}>
            {roles.map((item) => {
              const selected = role === item.role
              const Icon = item.icon
              return (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => pickRole(item)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
                    selected
                      ? "border-[#93c5fd] bg-[#eff6ff] dark:border-sky-500/40 dark:bg-sky-500/10"
                      : "border-border bg-white hover:bg-muted/40 dark:bg-card",
                  )}
                >
                  <span className={cn("grid size-9 place-items-center rounded-full", item.iconWrap)}>
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{item.title}</span>
                    <span className="block text-[12px] text-muted-foreground">{item.blurb}</span>
                  </span>
                  <span
                    className={cn(
                      "grid size-4 place-items-center rounded-full border",
                      selected ? "border-[#2563eb] bg-[#2563eb]" : "border-neutral-300 bg-white dark:border-input",
                    )}
                  >
                    {selected ? <span className="size-1.5 rounded-full bg-white" /> : null}
                  </span>
                </button>
              )
            })}

            <div className="pt-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email address
              </label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  autoComplete="username"
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-white pr-3 pl-10 text-sm outline-none focus:border-[#2563eb] focus:ring-3 focus:ring-[#2563eb]/15 dark:bg-card"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <button
                  type="button"
                  className="text-sm font-medium text-[#2563eb]"
                  onClick={() => setHint("Ask your administrator to reset the demo password.")}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  autoComplete="current-password"
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-white pr-10 pl-10 text-sm outline-none focus:border-[#2563eb] focus:ring-3 focus:ring-[#2563eb]/15 dark:bg-card"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error ? <p className="text-xs text-risk-critical">{error}</p> : null}
            {!isFirebaseConfigured() ? (
              <p className="text-xs text-risk-critical">
                Firebase env vars are missing. On Vercel, set VITE_FIREBASE_* for Production and Preview, then redeploy.
              </p>
            ) : null}
            {hint && !error ? <p className="text-xs text-muted-foreground">{hint}</p> : null}

            <button
              type="submit"
              disabled={busy}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8] disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Continue"}
              <ArrowRight className="size-4" />
            </button>
          </form>

          <div className="mt-6 flex items-center gap-3 text-[13px] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            Or continue with
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2.5">
            {[
              { label: "Microsoft", icon: <MicrosoftMark /> },
              { label: "Google", icon: <GoogleMark /> },
              { label: "Okta", icon: <OktaMark /> },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setHint(`${item.label} SSO is not enabled on this demo tenant.`)}
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-white text-sm font-medium hover:bg-muted/50 dark:bg-card"
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>

          <p className="mt-8 text-center text-[13px] text-muted-foreground">
            New to TPRM?{" "}
            <button
              type="button"
              className="font-medium text-[#2563eb]"
              onClick={() => setHint("Contact your administrator for a directory invite.")}
            >
              Contact your administrator.
            </button>
          </p>
        </div>
      </section>
    </div>
  )
}

function MicrosoftMark() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
      <rect width="7" height="7" fill="#F25022" />
      <rect x="9" width="7" height="7" fill="#7FBA00" />
      <rect y="9" width="7" height="7" fill="#00A4EF" />
      <rect x="9" y="9" width="7" height="7" fill="#FFB900" />
    </svg>
  )
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.4h4.8c-.2 1.1-.8 2-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5z" />
      <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.6-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3C2.4 16 5.5 18 9 18z" />
      <path fill="#FBBC05" d="M3.9 10.7c-.2-.6-.3-1.2-.3-1.7s.1-1.2.3-1.7V5H.9C.3 6.2 0 7.6 0 9s.3 2.8.9 4l3-2.3z" />
      <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.5-2.5C13.5.9 11.4 0 9 0 5.5 0 2.4 2 0.9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6z" />
    </svg>
  )
}

function OktaMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#007DC1" />
      <circle cx="12" cy="12" r="4.2" fill="white" />
    </svg>
  )
}
