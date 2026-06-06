import DashboardShell from "../components/dashboard/DashboardShell";
import DashboardLayout from "../layouts/DashboardLayout";

const OwnerDashboard = () => (
  <DashboardLayout title="Owner Dashboard" subtitle="Portfolio Headquarters">
    <DashboardShell mode="owner" basePath="/owner" />
  </DashboardLayout>
);

export default OwnerDashboard;
