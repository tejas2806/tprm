import { doc, getDoc, getDocs, limit, query, setDoc, where } from "firebase/firestore"
import type { User } from "firebase/auth"
import { defaultTenantId, getDb } from "@/lib/firebase"
import { emailRef, usersCol } from "@/lib/firestore/paths"
import type { EmailDoc, UserDoc } from "@/lib/firestore/schema"
import { omitUndefined } from "@/lib/firestore/mappers"
import { profileFromEmail } from "@/data/accounts"
import type { DirectoryUser, SessionUser, UserRole } from "@/types"

function isRole(value: unknown): value is UserRole {
  return value === "admin" || value === "infosec" || value === "vendor"
}

export function sessionFromUserDoc(id: string, email: string, data: Partial<UserDoc>, fallbackName?: string): SessionUser {
  const mapped = profileFromEmail(email)
  return {
    id,
    email,
    name: data.name || fallbackName || mapped?.name || email,
    title: data.title || mapped?.title || "User",
    role: isRole(data.role) ? data.role : mapped?.role ?? "infosec",
    vendorId: data.vendorId || mapped?.vendorId,
    vendorName: data.vendorName || mapped?.vendorName,
  }
}

export async function resolveSession(user: User, claims: Record<string, unknown>): Promise<SessionUser> {
  const email = user.email?.toLowerCase() ?? ""
  if (isRole(claims.role)) {
    return {
      id: user.uid,
      email,
      name: user.displayName || profileFromEmail(email)?.name || email,
      title: typeof claims.title === "string" ? claims.title : profileFromEmail(email)?.title || "User",
      role: claims.role,
      vendorId: typeof claims.vendorId === "string" ? claims.vendorId : undefined,
      vendorName: typeof claims.vendorName === "string" ? claims.vendorName : undefined,
    }
  }

  const db = getDb()
  if (db) {
    const snap = await getDoc(doc(usersCol(db, defaultTenantId), user.uid))
    const byEmail = await findDirectoryUserByEmail(email)
    const uidData = snap.exists() ? (snap.data() as UserDoc) : undefined
    if (uidData || byEmail) {
      return sessionFromUserDoc(
        user.uid,
        email,
        {
          ...(byEmail ?? {}),
          ...(uidData ?? {}),
          vendorId: uidData?.vendorId || byEmail?.vendorId,
          vendorName: uidData?.vendorName || byEmail?.vendorName,
          role: uidData?.role || byEmail?.role,
        },
        user.displayName ?? undefined,
      )
    }
  }

  return sessionFromUserDoc(user.uid, email, {}, user.displayName ?? undefined)
}

export async function findDirectoryUserByEmail(email: string): Promise<DirectoryUser | null> {
  const db = getDb()
  if (!db) return null
  const normalized = email.trim().toLowerCase()
  try {
    const pointer = await getDoc(emailRef(db, defaultTenantId, normalized))
    if (pointer.exists()) {
      const data = pointer.data() as EmailDoc
      return {
        id: data.userId || pointer.id,
        email: data.email || normalized,
        name: data.name,
        title: data.title,
        role: data.role,
        vendorId: data.vendorId,
        vendorName: data.vendorName,
        active: data.active !== false,
        createdAt: "",
      }
    }
  } catch {
    // Fall through to the users query.
  }
  try {
    const snap = await getDocs(
      query(usersCol(db, defaultTenantId), where("email", "==", normalized), limit(1)),
    )
    if (snap.empty) return null
    const row = snap.docs[0]!
    const data = row.data() as UserDoc
    return {
      id: row.id,
      email: data.email,
      name: data.name,
      title: data.title,
      role: data.role,
      vendorId: data.vendorId,
      vendorName: data.vendorName,
      active: data.active !== false,
      createdAt: data.createdAt,
    }
  } catch {
    return null
  }
}

export async function upsertUserProfile(session: SessionUser) {
  const db = getDb()
  if (!db) return
  const ref = doc(usersCol(db, defaultTenantId), session.id)
  const payload = omitUndefined({
    email: session.email,
    name: session.name,
    title: session.title,
    role: session.role,
    vendorId: session.vendorId,
    vendorName: session.vendorName,
    active: true,
    createdAt: new Date().toISOString(),
  })
  await setDoc(ref, payload, { merge: true })
  await setDoc(
    emailRef(db, defaultTenantId, session.email),
    omitUndefined({
      userId: session.id,
      email: session.email,
      name: session.name,
      title: session.title,
      role: session.role,
      vendorId: session.vendorId,
      vendorName: session.vendorName,
      active: true,
    }),
    { merge: true },
  )
}
