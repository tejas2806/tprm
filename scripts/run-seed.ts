import { initializeApp } from "firebase/app"
import { getAuth, signInWithEmailAndPassword } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { ensureQuestionBank, ensureTenantSeeded } from "../src/lib/firestore/seed-tenant"

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
})

const auth = getAuth(app)
const db = getFirestore(app)
const tenantId = process.env.VITE_FIREBASE_TENANT_ID || "northline"

const cred = await signInWithEmailAndPassword(auth, "suyog@northline.example", "demo123")
console.log("signed in", cred.user.uid)
await ensureTenantSeeded(db, tenantId)
await ensureQuestionBank(db, tenantId)
console.log("seed complete")
process.exit(0)
