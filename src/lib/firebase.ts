import { initializeApp, type FirebaseApp } from "firebase/app"
import { getAnalytics, type Analytics } from "firebase/analytics"
import { getAuth, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getStorage, type FirebaseStorage } from "firebase/storage"

/** Public Firebase web client config (safe in the browser bundle). Env vars override. */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyB5pbKzs8O9P3s5q42Z30n19fit6uSqIGQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "tprm-fad35.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "tprm-fad35",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "tprm-fad35.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "708549867520",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:708549867520:web:6c2f4690005d63a33980e5",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-DX182GNJ4H",
}

export const defaultTenantId = import.meta.env.VITE_FIREBASE_TENANT_ID || "northline"

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId)
}

let app: FirebaseApp | null = null
let db: Firestore | null = null
let auth: Auth | null = null
let analytics: Analytics | null = null
let storage: FirebaseStorage | null = null

export function getFirebaseApp() {
  if (!isFirebaseConfigured()) return null
  app ??= initializeApp(firebaseConfig)
  return app
}

export function getDb() {
  const instance = getFirebaseApp()
  if (!instance) return null
  db ??= getFirestore(instance)
  return db
}

export function getFirebaseAuth() {
  const instance = getFirebaseApp()
  if (!instance) return null
  auth ??= getAuth(instance)
  return auth
}

export function getFirebaseAnalytics() {
  const instance = getFirebaseApp()
  if (!instance || typeof window === "undefined" || !firebaseConfig.measurementId) return null
  try {
    analytics ??= getAnalytics(instance)
    return analytics
  } catch (error) {
    console.warn("[tprm] analytics", error)
    return null
  }
}

export function getFirebaseStorage() {
  const instance = getFirebaseApp()
  if (!instance || !firebaseConfig.storageBucket) return null
  storage ??= getStorage(instance)
  return storage
}
