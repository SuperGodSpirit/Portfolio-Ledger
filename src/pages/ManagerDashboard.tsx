import DashboardShell from "../components/dashboard/DashboardShell";
import DashboardLayout from "../layouts/DashboardLayout";

const ManagerDashboard = () => (
  <DashboardLayout title="Manager Dashboard" subtitle="Portfolio operations">
    <DashboardShell mode="manager" basePath="/manager" />
  </DashboardLayout>
);

export default ManagerDashboard;
