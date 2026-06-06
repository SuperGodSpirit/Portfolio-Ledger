import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/ui/Spinner";

const dashboardPathByRole = {
  owner: "/owner",
  manager: "/manager",
  viewer: "/viewer",
} as const;

const RoleRedirect = () => {
  const { firebaseUser, ledgerUser, isLoading } = useAuth();

  if (isLoading) {
    return <Spinner label="Loading portfolio access" />;
  }

  if (!firebaseUser) {
    return <Navigate to="/login" replace />;
  }

  if (!ledgerUser || !ledgerUser.active) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={dashboardPathByRole[ledgerUser.role]} replace />;
};

export default RoleRedirect;
