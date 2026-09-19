import { cn } from "cn"

export function AegisMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn(className)} aria-hidden>
      <path
        d="M16 3.5 6 8.2v7.3c0 7.1 4.3 11.6 10 13 5.7-1.4 10-5.9 10-13V8.2L16 3.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M16 8v16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10.5 14.5h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="16" cy="14.5" r="2.2" fill="currentColor" />
    </svg>
  )
}
