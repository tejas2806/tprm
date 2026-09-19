const key = process.env.VITE_FIREBASE_API_KEY
const project = process.env.VITE_FIREBASE_PROJECT_ID
const tenant = process.env.VITE_FIREBASE_TENANT_ID || "northline"

async function signIn(email, password) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  )
  const body = await res.json()
  if (!res.ok) throw new Error(`${email}: ${body.error?.message || res.status}`)
  return body
}

async function firestore(idToken, path, { method = "GET", body } = {}) {
  const url = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/${path}`
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  return { ok: res.ok, status: res.status, json }
}

function str(value) {
  return { stringValue: value }
}
function bool(value) {
  return { booleanValue: value }
}

const desk = [
  {
    email: "suyog@northline.example",
    password: "demo123",
    name: "Suyog Khairnar",
    title: "Sr. Third-Party Risk",
    role: "infosec",
  },
  {
    email: "admin@northline.example",
    password: "demo123",
    name: "Priya Menon",
    title: "TPRM platform admin",
    role: "admin",
  },
]

const now = new Date().toISOString()

for (const account of desk) {
  const auth = await signIn(account.email, account.password)
  console.log("signed in", account.email, auth.localId)

  const userFields = {
    email: str(account.email),
    name: str(account.name),
    title: str(account.title),
    role: str(account.role),
    active: bool(true),
    createdAt: str(now),
  }

  const userWrite = await firestore(auth.idToken, `tenants/${tenant}/users/${auth.localId}`, {
    method: "PATCH",
    body: { fields: userFields },
  })
  console.log("write user", userWrite.status, userWrite.ok ? "ok" : userWrite.json.error?.message)

  const emailWrite = await firestore(auth.idToken, `tenants/${tenant}/emails/${account.email}`, {
    method: "PATCH",
    body: {
      fields: {
        userId: str(auth.localId),
        email: str(account.email),
        name: str(account.name),
        title: str(account.title),
        role: str(account.role),
        active: bool(true),
      },
    },
  })
  console.log("write email", emailWrite.status, emailWrite.ok ? "ok" : emailWrite.json.error?.message)

  const tenantWrite = await firestore(auth.idToken, `tenants/${tenant}`, {
    method: "PATCH",
    body: {
      fields: {
        name: str("Northline Bank"),
        slug: str(tenant),
        fiscalPeriod: str("FY26"),
        createdAt: str(now),
        seeded: bool(false),
      },
    },
  })
  console.log("write tenant", tenantWrite.status, tenantWrite.ok ? "ok" : tenantWrite.json.error?.message)

  const vendors = await firestore(auth.idToken, `tenants/${tenant}/vendors`)
  console.log("list vendors", vendors.status, vendors.ok ? (vendors.json.documents || []).length : vendors.json.error?.message)
}
