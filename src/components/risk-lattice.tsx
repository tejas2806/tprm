import { Link } from "react-router-dom"
import { cn } from "cn"
import type { Vendor } from "@/types"

const cells = [0, 1, 2, 3, 4]

function band(score: number) {
  return Math.min(4, Math.max(0, Math.floor(score / 20)))
}

function cellTone(inherentBand: number, residualBand: number) {
  const heat = inherentBand + residualBand
  if (heat >= 7) return "bg-risk-critical/18"
  if (heat >= 5) return "bg-risk-high/16"
  if (heat >= 3) return "bg-risk-moderate/14"
  return "bg-risk-low/10"
}

export function RiskLattice({ vendors }: { vendors: Vendor[] }) {
  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Risk lattice</p>
          <h2 className="text-lg font-semibold tracking-tight">Inherent × residual</h2>
        </div>
        <p className="max-w-sm text-right text-xs text-muted-foreground">
          Material vendors should migrate down and left. Dots in the top-right still carry untreated inherent risk.
        </p>
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <div className="flex flex-col justify-between py-1 text-[11px] text-muted-foreground">
          <span>High inherent</span>
          <span className="-rotate-90 text-center">Inherent</span>
          <span>Low</span>
        </div>
        <div>
          <div className="grid aspect-[1.4/1] grid-cols-5 grid-rows-5 gap-1">
            {[...cells].reverse().flatMap((y) =>
              cells.map((x) => {
                const here = vendors.filter(
                  (vendor) => band(vendor.residual) === x && band(vendor.inherent) === y,
                )
                return (
                  <div
                    key={`${x}-${y}`}
                    className={cn(
                      "relative flex flex-wrap content-center items-center justify-center gap-1 rounded-md ring-1 ring-border",
                      cellTone(y, x),
                    )}
                  >
                    {here.map((vendor) => (
                      <Link
                        key={vendor.id}
                        to={`/vendors/${vendor.id}`}
                        title={`${vendor.name} · I${vendor.inherent} R${vendor.residual}`}
                        className="size-2.5 rounded-full bg-foreground/70 ring-2 ring-background transition-transform duration-150 hover:scale-125 hover:bg-primary"
                      />
                    ))}
                  </div>
                )
              }),
            )}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
            <span>Low residual</span>
            <span>Residual →</span>
            <span>High residual</span>
          </div>
        </div>
      </div>
    </div>
  )
}
