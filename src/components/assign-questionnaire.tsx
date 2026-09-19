import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTprm } from "@/state/tprm-store"

export function AssignQuestionnaireForm({
  vendorId: lockedVendorId,
  questionnaireId: lockedPackId,
}: {
  vendorId?: string
  questionnaireId?: string
}) {
  const { vendors, questionnaires, assessments, assignQuestionnaire } = useTprm()
  const [vendorId, setVendorId] = useState(lockedVendorId ?? "")
  const [questionnaireId, setQuestionnaireId] = useState(lockedPackId ?? "")
  const [busy, setBusy] = useState(false)

  const readyPacks = useMemo(
    () => questionnaires.filter((pack) => pack.questions.length > 0),
    [questionnaires],
  )
  const selectedVendor = lockedVendorId ?? vendorId
  const selectedPack = lockedPackId ?? questionnaireId
  const alreadyOpen = assessments.some(
    (item) =>
      item.vendorId === selectedVendor &&
      item.questionnaireId === selectedPack &&
      item.stage !== "monitoring",
  )

  async function assign() {
    if (!selectedVendor || !selectedPack) {
      toast.error("Pick a vendor and a questionnaire first.")
      return
    }
    setBusy(true)
    try {
      const { assessment } = await assignQuestionnaire(selectedVendor, selectedPack)
      toast.success(`${assessment.template} is now on ${assessment.vendorName}.`)
      if (!lockedVendorId) setVendorId("")
      if (!lockedPackId) setQuestionnaireId("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not assign that pack.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      {lockedVendorId ? null : (
        <div className="space-y-1.5">
          <Label>Vendor</Label>
          <Select value={vendorId || undefined} onValueChange={setVendorId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Choose vendor" />
            </SelectTrigger>
            <SelectContent position="popper">
              {vendors.map((vendor) => (
                <SelectItem key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {lockedPackId ? null : (
        <div className="space-y-1.5">
          <Label>Questionnaire</Label>
          <Select value={questionnaireId || undefined} onValueChange={setQuestionnaireId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder={readyPacks.length ? "Choose pack" : "Bank still loading"} />
            </SelectTrigger>
            <SelectContent position="popper">
              {readyPacks.map((pack) => (
                <SelectItem key={pack.id} value={pack.id}>
                  {pack.name} · {pack.questions.length} items
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <Button onClick={() => void assign()} disabled={busy || alreadyOpen || !selectedVendor || !selectedPack}>
        {alreadyOpen ? "Already assigned" : busy ? "Assigning…" : "Assign to vendor"}
      </Button>
    </div>
  )
}
