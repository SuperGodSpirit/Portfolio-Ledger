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
import AdminCenter from "./pages/AdminCenter";
import TermsConditionsPage from "./pages/TermsConditionsPage";
import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRedirect from "./routes/RoleRedirect";
import ReportsExportPage from "./pages/ReportsExportPage";
import MarketIposPage from "./pages/MarketIposPage";

import PendingAccess from "./pages/PendingAccess";
import DeactivatedAccess from "./pages/DeactivatedAccess";

const App = () => (
  <Routes>
    <Route path="/" element={<RoleRedirect />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/pending" element={<PendingAccess />} />
    <Route path="/deactivated" element={<DeactivatedAccess />} />
    <Route path="/privacy" element={<PrivacyPolicyPage />} />
    <Route path="/terms" element={<TermsConditionsPage />} />

    <Route element={<ProtectedRoute allowedRoles={["owner"]} />}>
      <Route path="/owner" element={<OwnerDashboard />} />
      <Route path="/owner/market" element={<MarketIposPage basePath="/owner" canApply={true} />} />
      <Route path="/owner/ipos" element={<IpoHistoryPage basePath="/owner" />} />
      <Route path="/owner/ipos/add" element={<AddIpoPage basePath="/owner" />} />
      <Route path="/owner/ipos/:ipoId/edit" element={<EditIpoPage basePath="/owner" />} />
      <Route path="/owner/ipos/:ipoId" element={<IpoDetailViewPage basePath="/owner" />} />
      <Route path="/owner/settlements" element={<SettlementCenterPage basePath="/owner" />} />
      <Route path="/owner/analytics" element={<AnalyticsPage basePath="/owner" />} />
      <Route path="/owner/audit" element={<AuditLogPage basePath="/owner" />} />
      <Route path="/owner/admin" element={<AdminCenter />} />
      <Route path="/owner/reports" element={<ReportsExportPage basePath="/owner" />} />
    </Route>

    <Route element={<ProtectedRoute allowedRoles={["manager"]} />}>
      <Route path="/manager" element={<ManagerDashboard />} />
      <Route path="/manager/market" element={<MarketIposPage basePath="/manager" canApply={true} />} />
      <Route path="/manager/ipos" element={<IpoHistoryPage basePath="/manager" />} />
      <Route path="/manager/ipos/add" element={<AddIpoPage basePath="/manager" />} />
      <Route path="/manager/ipos/:ipoId/edit" element={<EditIpoPage basePath="/manager" />} />
      <Route path="/manager/ipos/:ipoId" element={<IpoDetailViewPage basePath="/manager" />} />
      <Route path="/manager/settlements" element={<SettlementCenterPage basePath="/manager" />} />
      <Route path="/manager/analytics" element={<AnalyticsPage basePath="/manager" />} />
      <Route path="/manager/audit" element={<AuditLogPage basePath="/manager" />} />
      <Route path="/manager/admin" element={<AdminCenter />} />
      <Route path="/manager/reports" element={<ReportsExportPage basePath="/manager" />} />
    </Route>

    <Route element={<ProtectedRoute allowedRoles={["viewer"]} />}>
      <Route path="/viewer" element={<ViewerDashboard />} />
      <Route path="/viewer/market" element={<MarketIposPage basePath="/viewer" canApply={false} />} />
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
