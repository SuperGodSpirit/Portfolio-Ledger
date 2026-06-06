import { Navigate, Route, Routes } from "react-router-dom";
import AddIpoPage from "./pages/AddIpoPage";
import EditIpoPage from "./pages/EditIpoPage";
import IpoDetailViewPage from "./pages/IpoDetailViewPage";
import IpoHistoryPage from "./pages/IpoHistoryPage";
import LoginPage from "./pages/LoginPage";
import ManagerDashboard from "./pages/ManagerDashboard";
import NotFoundPage from "./pages/NotFoundPage";
import OwnerDashboard from "./pages/OwnerDashboard";
import SettlementCenterPage from "./pages/SettlementCenterPage";
import ViewerDashboard from "./pages/ViewerDashboard";
import AnalyticsPage from "./pages/AnalyticsPage";
import AuditLogPage from "./pages/AuditLogPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import PsrManagementPage from "./pages/PsrManagementPage";
import TermsConditionsPage from "./pages/TermsConditionsPage";
import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRedirect from "./routes/RoleRedirect";

const App = () => (
  <Routes>
    <Route path="/" element={<RoleRedirect />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/privacy" element={<PrivacyPolicyPage />} />
    <Route path="/terms" element={<TermsConditionsPage />} />

    <Route element={<ProtectedRoute allowedRoles={["owner"]} />}>
      <Route path="/owner" element={<OwnerDashboard />} />
      <Route path="/owner/ipos" element={<IpoHistoryPage basePath="/owner" />} />
      <Route path="/owner/ipos/add" element={<AddIpoPage basePath="/owner" />} />
      <Route path="/owner/ipos/:ipoId/edit" element={<EditIpoPage basePath="/owner" />} />
      <Route path="/owner/ipos/:ipoId" element={<IpoDetailViewPage basePath="/owner" />} />
      <Route path="/owner/settlements" element={<SettlementCenterPage basePath="/owner" />} />
      <Route path="/owner/analytics" element={<AnalyticsPage basePath="/owner" />} />
      <Route path="/owner/audit" element={<AuditLogPage basePath="/owner" />} />
      <Route path="/owner/psr" element={<PsrManagementPage basePath="/owner" />} />
    </Route>

    <Route element={<ProtectedRoute allowedRoles={["manager"]} />}>
      <Route path="/manager" element={<ManagerDashboard />} />
      <Route path="/manager/ipos" element={<IpoHistoryPage basePath="/manager" />} />
      <Route path="/manager/ipos/add" element={<AddIpoPage basePath="/manager" />} />
      <Route path="/manager/ipos/:ipoId/edit" element={<EditIpoPage basePath="/manager" />} />
      <Route path="/manager/ipos/:ipoId" element={<IpoDetailViewPage basePath="/manager" />} />
      <Route path="/manager/settlements" element={<SettlementCenterPage basePath="/manager" />} />
      <Route path="/manager/analytics" element={<AnalyticsPage basePath="/manager" />} />
      <Route path="/manager/audit" element={<AuditLogPage basePath="/manager" />} />
      <Route path="/manager/psr" element={<PsrManagementPage basePath="/manager" />} />
    </Route>

    <Route element={<ProtectedRoute allowedRoles={["viewer"]} />}>
      <Route path="/viewer" element={<ViewerDashboard />} />
      <Route path="/viewer/ipos" element={<IpoHistoryPage basePath="/viewer" />} />
      <Route path="/viewer/ipos/:ipoId" element={<IpoDetailViewPage basePath="/viewer" />} />
      <Route path="/viewer/settlements" element={<SettlementCenterPage basePath="/viewer" />} />
      <Route path="/viewer/analytics" element={<AnalyticsPage basePath="/viewer" />} />
    </Route>

    <Route path="/dashboard" element={<Navigate to="/" replace />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);

export default App;
