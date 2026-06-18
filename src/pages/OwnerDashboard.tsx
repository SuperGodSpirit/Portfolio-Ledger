import DashboardShell from "../components/dashboard/DashboardShell";
import DashboardLayout from "../layouts/DashboardLayout";
import NotificationPromptCard from "../components/dashboard/NotificationPromptCard";

const OwnerDashboard = () => (
  <DashboardLayout title="Owner Dashboard" subtitle="Portfolio Headquarters">
    <NotificationPromptCard />
    <DashboardShell mode="owner" basePath="/owner" />
  </DashboardLayout>
);

export default OwnerDashboard;
