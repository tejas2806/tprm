import { Navigate, Outlet, useLocation } from "react-router-dom"
import { homeFor, useAuth } from "@/state/auth"
import type { UserRole } from "@/types"

function Boot() {
  return <div className="min-h-svh bg-background" />
}

export function RequireAuth() {
  const { user, ready } = useAuth()
  const location = useLocation()
  if (!ready) return <Boot />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

export function RoleGate({ role }: { role: UserRole }) {
  const { user, ready } = useAuth()
  if (!ready) return <Boot />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to={homeFor(user)} replace />
  return <Outlet />
}

export function RoleHomeRedirect() {
  const { user, ready } = useAuth()
  if (!ready) return <Boot />
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={homeFor(user)} replace />
}
