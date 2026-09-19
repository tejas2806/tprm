import { getDocs, setDoc } from "firebase/firestore"
import { getDownloadURL, ref, uploadBytes } from "firebase/storage"
import { defaultTenantId, getDb, getFirebaseStorage } from "@/lib/firebase"
import { evidenceChunkRef, evidenceChunksCol, evidenceFileRef } from "@/lib/firestore/paths"

const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED = /\.(pdf|png|jpe?g|webp|gif|csv|txt|xlsx|xls|docx|doc|zip)$/i
const BINARY_CHUNK = 450_000
export const FIRESTORE_EVIDENCE_PREFIX = "firestore:"

function safeName(name: string) {
  const base = name.split(/[/\\]/).pop() || "evidence"
  return base.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80)
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ""
  const slice = 0x8000
  for (let i = 0; i < bytes.length; i += slice) {
    binary += String.fromCharCode(...bytes.subarray(i, i + slice))
  }
  return btoa(binary)
}

function base64ToBytes(value: string) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export async function uploadQuestionEvidence(input: {
  vendorId: string
  assessmentId: string
  questionId: string
  file: File
}) {
  if (input.file.size > MAX_BYTES) {
    throw new Error("Keep evidence files under 10 MB.")
  }
  if (!ALLOWED.test(input.file.name)) {
    throw new Error("Upload a PDF, image, Office file, CSV, or ZIP.")
  }
  try {
    return await uploadToStorage(input)
  } catch (error) {
    console.warn("[tprm] storage upload, using Firestore", error)
    return uploadToFirestore(input)
  }
}

async function uploadToStorage(input: {
  vendorId: string
  assessmentId: string
  questionId: string
  file: File
}) {
  const storage = getFirebaseStorage()
  if (!storage) throw new Error("storage-unconfigured")
  const filename = `${Date.now()}_${safeName(input.file.name)}`
  const path = `tenants/${defaultTenantId}/vendors/${input.vendorId}/evidence/${input.assessmentId}/${input.questionId}/${filename}`
  const fileRef = ref(storage, path)
  await uploadBytes(fileRef, input.file, { contentType: input.file.type || "application/octet-stream" })
  const url = await getDownloadURL(fileRef)
  return { name: input.file.name, url }
}

async function uploadToFirestore(input: {
  vendorId: string
  assessmentId: string
  questionId: string
  file: File
}) {
  const db = getDb()
  if (!db) throw new Error("Firestore is not configured.")
  const fileId = `evd_${input.questionId}_${Date.now()}`
  const buffer = new Uint8Array(await input.file.arrayBuffer())
  const now = new Date().toISOString()
  await setDoc(evidenceFileRef(db, defaultTenantId, fileId), {
    vendorId: input.vendorId,
    assessmentId: input.assessmentId,
    questionId: input.questionId,
    name: input.file.name,
    contentType: input.file.type || "application/octet-stream",
    size: input.file.size,
    updatedAt: now,
  })
  const writes = []
  for (let offset = 0, index = 0; offset < buffer.length; offset += BINARY_CHUNK, index += 1) {
    const slice = buffer.subarray(offset, offset + BINARY_CHUNK)
    writes.push(
      setDoc(evidenceChunkRef(db, defaultTenantId, fileId, `c${String(index).padStart(4, "0")}`), {
        vendorId: input.vendorId,
        index,
        data: bytesToBase64(slice),
      }),
    )
  }
  await Promise.all(writes)
  return { name: input.file.name, url: `${FIRESTORE_EVIDENCE_PREFIX}${fileId}` }
}

const objectUrlCache = new Map<string, string>()

export function isFirestoreEvidence(url?: string) {
  return Boolean(url?.startsWith(FIRESTORE_EVIDENCE_PREFIX))
}

export async function resolveEvidenceUrl(url: string) {
  if (!isFirestoreEvidence(url)) return url
  const cached = objectUrlCache.get(url)
  if (cached) return cached
  const db = getDb()
  if (!db) throw new Error("Firestore is not configured.")
  const fileId = url.slice(FIRESTORE_EVIDENCE_PREFIX.length)
  const snap = await getDocs(evidenceChunksCol(db, defaultTenantId, fileId))
  const chunks = snap.docs
    .map((row) => ({ index: Number(row.data().index ?? 0), data: String(row.data().data ?? "") }))
    .sort((a, b) => a.index - b.index)
  const pieces = chunks.map((chunk) => base64ToBytes(chunk.data))
  const total = pieces.reduce((sum, part) => sum + part.length, 0)
  const merged = new Uint8Array(total)
  let offset = 0
  for (const part of pieces) {
    merged.set(part, offset)
    offset += part.length
  }
  const blob = new Blob([merged])
  const objectUrl = URL.createObjectURL(blob)
  objectUrlCache.set(url, objectUrl)
  return objectUrl
}
