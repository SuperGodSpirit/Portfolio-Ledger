import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import { setupForegroundMessageListener } from "./services/notificationService";
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
import SettingsPage from "./pages/SettingsPage";

import PendingAccess from "./pages/PendingAccess";
import DeactivatedAccess from "./pages/DeactivatedAccess";

const App = () => {
  useEffect(() => {
    let unsubscribe: () => void;
    setupForegroundMessageListener((payload) => {
      console.log("Foreground message received:", payload);
      // In a real app, you might want to use a toast library instead of alert
      if (payload?.notification) {
        // Just log for now to avoid annoying alerts, or use a custom toast
        // but since we don't have a toast component ready, we'll just log it.
        // The browser might also show it if configured.
        console.info(`🔔 ${payload.notification.title}: ${payload.notification.body}`);
      }
    }).then((unsub) => {
      if (typeof unsub === "function") {
        unsubscribe = unsub;
      }
    });
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return (
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
      <Route path="/owner/settings" element={<SettingsPage basePath="/owner" />} />
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
      <Route path="/manager/settings" element={<SettingsPage basePath="/manager" />} />
    </Route>

    <Route element={<ProtectedRoute allowedRoles={["viewer"]} />}>
      <Route path="/viewer" element={<ViewerDashboard />} />
      <Route path="/viewer/market" element={<MarketIposPage basePath="/viewer" canApply={false} />} />
      <Route path="/viewer/ipos" element={<IpoHistoryPage basePath="/viewer" />} />
      <Route path="/viewer/ipos/:ipoId" element={<IpoDetailViewPage basePath="/viewer" />} />
      <Route path="/viewer/settlements" element={<SettlementCenterPage basePath="/viewer" />} />
      <Route path="/viewer/analytics" element={<AnalyticsPage basePath="/viewer" />} />
      <Route path="/viewer/settings" element={<SettingsPage basePath="/viewer" />} />
    </Route>

    <Route path="/dashboard" element={<Navigate to="/" replace />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
  );
};

export default App;
