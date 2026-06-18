import DashboardShell from "../components/dashboard/DashboardShell";
import DashboardLayout from "../layouts/DashboardLayout";
import NotificationPromptCard from "../components/dashboard/NotificationPromptCard";

const ManagerDashboard = () => (
  <DashboardLayout title="Portfolio Director" subtitle="Portfolio operations">
    <NotificationPromptCard />
    <DashboardShell mode="manager" basePath="/manager" />
  </DashboardLayout>
);

export default ManagerDashboard;
