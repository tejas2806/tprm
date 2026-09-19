import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type Auth,
  type User,
} from "firebase/auth"
import { findAccount, roleHome, toSession } from "@/data/accounts"
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase"
import { findDirectoryUserByEmail, resolveSession, upsertUserProfile } from "@/lib/firestore/profile"
import type { SessionUser } from "@/types"

type AuthContextValue = {
  ready: boolean
  user: SessionUser | null
  login: (email: string, password: string) => Promise<SessionUser | null>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function authErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : ""
  const message = error instanceof Error ? error.message : ""
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
    return "Email or password is incorrect."
  }
  if (code === "auth/operation-not-allowed") {
    return "Email/password sign-in is not enabled in Firebase Authentication."
  }
  if (code === "auth/weak-password") {
    return "Password must be at least 6 characters."
  }
  if (code === "auth/invalid-email") return "Enter a valid email address."
  if (code === "auth/too-many-requests") return "Too many attempts. Try again in a minute."
  if (code === "auth/network-request-failed") return "Network error. Check your connection."
  if (code === "permission-denied" || /insufficient permissions/i.test(message)) {
    return "This email is not in the directory, or the account cannot be read. Ask an admin to add you, then sign in with demo123."
  }
  if (code === "directory/not-found") {
    return "This email is not in the directory. Ask an admin to add you first."
  }
  return message || "Sign-in failed."
}

function errorCode(error: unknown) {
  return typeof error === "object" && error && "code" in error ? String(error.code) : ""
}

async function signInOrCreateDeskUser(auth: Auth, email: string, password: string) {
  try {
    return await signInWithEmailAndPassword(auth, email, password)
  } catch (error) {
    const code = errorCode(error)
    const missing =
      code === "auth/user-not-found" ||
      code === "auth/invalid-credential" ||
      code === "auth/wrong-password"
    if (!missing) throw error
    const desk = findAccount(email, password)
    const canProvision = Boolean(desk) || password === "demo123"
    if (!canProvision) throw error
    try {
      const created = await createUserWithEmailAndPassword(auth, email, password)
      await created.user.getIdToken(true)
      if (!desk) {
        const directory = await findDirectoryUserByEmail(email)
        if (!directory) {
          await created.user.delete().catch(() => undefined)
          throw Object.assign(new Error("This email is not in the directory. Ask an admin to add you first."), {
            code: "directory/not-found",
          })
        }
        await updateProfile(created.user, { displayName: directory.name })
      } else {
        await updateProfile(created.user, { displayName: desk.name })
      }
      return created
    } catch (createError) {
      if (errorCode(createError) === "auth/email-already-in-use") throw error
      throw createError
    }
  }
}

async function sessionFromFirebase(fbUser: User) {
  const token = await fbUser.getIdTokenResult()
  const session = await resolveSession(fbUser, token.claims)
  try {
    await upsertUserProfile(session)
  } catch {
    // Profile write is best-effort; login still succeeds.
  }
  return session
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<SessionUser | null>(null)

  useEffect(() => {
    const auth = getFirebaseAuth()
    if (!auth) {
      setReady(true)
      return
    }
    return onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null)
        setReady(true)
        return
      }
      try {
        setUser(await sessionFromFirebase(fbUser))
      } catch {
        setUser(null)
      } finally {
        setReady(true)
      }
    })
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const auth = getFirebaseAuth()
    if (auth && isFirebaseConfigured()) {
      const cred = await signInOrCreateDeskUser(auth, email.trim(), password)
      const session = await sessionFromFirebase(cred.user)
      setUser(session)
      return session
    }
    const account = findAccount(email, password)
    if (!account) return null
    const session = toSession(account)
    setUser(session)
    return session
  }, [])

  const logout = useCallback(async () => {
    const auth = getFirebaseAuth()
    if (auth) await signOut(auth)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ ready, user, login, logout }),
    [ready, user, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}

export function homeFor(user: SessionUser) {
  return roleHome[user.role]
}

export function formatAuthError(error: unknown) {
  return authErrorMessage(error)
}
