import { BrowserRouter, Route, Routes } from "react-router-dom"
import { ThemeProvider } from "next-themes"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider, useAuth } from "@/state/auth"
import { TprmProvider } from "@/state/tprm-store"
import { RoleShell } from "@/components/role-shell"
import { RequireAuth, RoleGate, RoleHomeRedirect } from "@/components/route-guards"
import { LoginPage } from "@/pages/login"
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
import { AdminOverview } from "@/pages/admin/overview"
import { AdminUsers } from "@/pages/admin/users"
import { AdminAccess } from "@/pages/admin/access"
import { AdminPolicies } from "@/pages/admin/policies"
import { AdminAudit } from "@/pages/admin/audit"
import { VendorHome } from "@/pages/vendor-portal/home"
import { VendorQuestionnaire } from "@/pages/vendor-portal/questionnaire"
import { VendorFindings } from "@/pages/vendor-portal/findings"
import { VendorEvidence } from "@/pages/vendor-portal/evidence"

function AuthedToaster() {
  const { user } = useAuth()
  if (!user) return null
  return <Toaster />
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="aegis-theme">
      <TooltipProvider>
        <AuthProvider>
          <TprmProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route element={<RequireAuth />}>
                  <Route element={<RoleGate role="infosec" />}>
                    <Route element={<RoleShell role="infosec" />}>
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
                    </Route>
                  </Route>
                  <Route element={<RoleGate role="admin" />}>
                    <Route element={<RoleShell role="admin" />}>
                      <Route path="/admin" element={<AdminOverview />} />
                      <Route path="/admin/users" element={<AdminUsers />} />
                      <Route path="/admin/access" element={<AdminAccess />} />
                      <Route path="/admin/policies" element={<AdminPolicies />} />
                      <Route path="/admin/audit" element={<AdminAudit />} />
                    </Route>
                  </Route>
                  <Route element={<RoleGate role="vendor" />}>
                    <Route element={<RoleShell role="vendor" />}>
                      <Route path="/vendor" element={<VendorHome />} />
                      <Route path="/vendor/questionnaire" element={<VendorQuestionnaire />} />
                      <Route path="/vendor/findings" element={<VendorFindings />} />
                      <Route path="/vendor/evidence" element={<VendorEvidence />} />
                    </Route>
                  </Route>
                </Route>
                <Route path="*" element={<RoleHomeRedirect />} />
              </Routes>
            </BrowserRouter>
            <AuthedToaster />
          </TprmProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}
