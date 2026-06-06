import DashboardShell from "../components/dashboard/DashboardShell";
import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";

const ViewerDashboard = () => {
  const { ledgerUser } = useAuth();
  const portfolioName = ledgerUser?.portfolioAlpha ? "Portfolio Alpha" : "Portfolio Beta";

  return (
    <DashboardLayout title="Dashboard" subtitle={portfolioName} readOnly>
      <DashboardShell mode="viewer" basePath="/viewer" readOnly />
    </DashboardLayout>
  );
};

export default ViewerDashboard;
