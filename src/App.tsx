import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { ThemeProvider } from "next-themes"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { TprmProvider } from "@/state/tprm-store"
import { AppShell } from "@/components/app-shell"
import { CommandCenter } from "@/pages/command-center"
import { VendorsPage } from "@/pages/vendors"
import { VendorDossier } from "@/pages/vendor-dossier"
import { IntakePage } from "@/pages/intake"
import { AssessmentsPage } from "@/pages/assessments"
import { AssessmentWorkspace } from "@/pages/assessment-workspace"
import { WatchtowerPage } from "@/pages/watchtower"
import { FindingsPage } from "@/pages/findings"
import { ConcentrationPage } from "@/pages/concentration"
import { QuestionnairesPage } from "@/pages/questionnaires"
import { ReportsPage } from "@/pages/reports"

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="aegis-theme">
      <TooltipProvider>
        <TprmProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/" element={<CommandCenter />} />
                <Route path="/vendors" element={<VendorsPage />} />
                <Route path="/vendors/:id" element={<VendorDossier />} />
                <Route path="/intake" element={<IntakePage />} />
                <Route path="/assessments" element={<AssessmentsPage />} />
                <Route path="/assessments/:id" element={<AssessmentWorkspace />} />
                <Route path="/watchtower" element={<WatchtowerPage />} />
                <Route path="/findings" element={<FindingsPage />} />
                <Route path="/concentration" element={<ConcentrationPage />} />
                <Route path="/questionnaires" element={<QuestionnairesPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
          <Toaster />
        </TprmProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}
