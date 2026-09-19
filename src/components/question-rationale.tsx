import { CircleHelp } from "lucide-react"

export function QuestionRationale({ text }: { text: string }) {
  if (!text.trim()) return null
  return (
    <div className="rounded-lg bg-primary/8 px-3 py-2.5 text-sm leading-relaxed ring-1 ring-primary/15">
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-primary">
        <CircleHelp className="size-3.5" />
        Why this matters
      </p>
      <p className="mt-1 text-sm text-foreground/90">{text}</p>
    </div>
  )
}
