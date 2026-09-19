const key = process.env.VITE_FIREBASE_API_KEY
const project = process.env.VITE_FIREBASE_PROJECT_ID
const tenant = process.env.VITE_FIREBASE_TENANT_ID || "northline"

const res = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${key}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "suyog@northline.example",
      password: "demo123",
      returnSecureToken: true,
    }),
  },
)
const auth = await res.json()
const list = await fetch(
  `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/tenants/${tenant}/vendors`,
  { headers: { Authorization: `Bearer ${auth.idToken}` } },
)
const json = await list.json()
for (const doc of json.documents || []) {
  const id = doc.name.split("/").pop()
  const name = doc.fields?.name?.stringValue
  console.log(id, name)
}
console.log("count", (json.documents || []).length)
if (json.error) console.log(json.error)
