import { useState } from "react"
import { Paperclip } from "lucide-react"
import { toast } from "sonner"
import { isFirestoreEvidence, resolveEvidenceUrl } from "@/lib/storage"
import { cn } from "cn"

export function EvidenceLink({
  href,
  label,
  className,
}: {
  href?: string
  label: string
  className?: string
}) {
  const [busy, setBusy] = useState(false)
  if (!href) {
    return <span className={className}>{label}</span>
  }

  async function open() {
    setBusy(true)
    try {
      const url = isFirestoreEvidence(href) ? await resolveEvidenceUrl(href!) : href!
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open that document.")
    } finally {
      setBusy(false)
    }
  }

  if (!isFirestoreEvidence(href)) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cn("inline-flex min-w-0 items-center gap-1.5 text-primary hover:underline", className)}>
        <Paperclip className="size-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </a>
    )
  }

  return (
    <button
      type="button"
      onClick={() => void open()}
      disabled={busy}
      className={cn("inline-flex min-w-0 items-center gap-1.5 text-left text-primary hover:underline", className)}
    >
      <Paperclip className="size-3.5 shrink-0" />
      <span className="truncate">{busy ? "Opening…" : label}</span>
    </button>
  )
}
