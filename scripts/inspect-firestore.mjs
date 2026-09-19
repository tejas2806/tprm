const key = process.env.VITE_FIREBASE_API_KEY
const project = process.env.VITE_FIREBASE_PROJECT_ID
const tenant = process.env.VITE_FIREBASE_TENANT_ID || "northline"

if (!key || !project) {
  console.error("Missing VITE_FIREBASE_* env")
  process.exit(1)
}

const accounts = [
  { email: "suyog@northline.example", password: "demo123", label: "infosec" },
  { email: "admin@northline.example", password: "demo123", label: "admin" },
]

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
  if (!res.ok) throw new Error(`${email} sign-in: ${body.error?.message || res.status}`)
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
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = { raw: text }
  }
  return { ok: res.ok, status: res.status, json }
}

function names(json) {
  const docs = json.documents || []
  return docs.map((doc) => doc.name?.split("/").pop())
}

for (const account of accounts) {
  console.log(`\n=== ${account.label} ${account.email} ===`)
  try {
    const auth = await signIn(account.email, account.password)
    console.log("uid", auth.localId)
    const token = auth.idToken
    const paths = [
      `tenants`,
      `tenants/${tenant}`,
      `tenants/${tenant}/vendors`,
      `tenants/${tenant}/users`,
      `tenants/${tenant}/emails`,
      `tenants/${tenant}/assessments`,
      `tenants/${tenant}/findings`,
      `tenants/${tenant}/signals`,
      `tenants/${tenant}/users/${auth.localId}`,
      `tenants/${tenant}/emails/${encodeURIComponent(account.email)}`,
    ]
    for (const path of paths) {
      const result = await firestore(token, path)
      if (path.endsWith("/vendors") || path.endsWith("/users") || path.endsWith("/emails") || path.endsWith("/assessments") || path.endsWith("/findings") || path.endsWith("/signals")) {
        console.log(result.status, path, result.ok ? `docs=${names(result.json).length} ${names(result.json).slice(0, 8).join(",")}` : result.json.error?.message || result.json.error?.status)
      } else {
        const fields = result.json.fields ? Object.keys(result.json.fields).join(",") : result.json.error?.message
        console.log(result.status, path, result.ok ? `fields=${fields}` : fields)
      }
    }
  } catch (error) {
    console.log("FAILED", error.message)
  }
}
