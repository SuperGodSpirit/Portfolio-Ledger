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

  if (!ledgerUser) {
    return <Navigate to="/login" replace />;
  }

  if (ledgerUser.status === "pending" || ledgerUser.active === false || ledgerUser.status === "deactivated") {
    if (ledgerUser.status === "pending") {
      return <Navigate to="/pending" replace />;
    }
    return <Navigate to="/deactivated" replace />;
  }

  const role = ledgerUser.role;
  if (role === "guest") {
    return <Navigate to="/pending" replace />;
  }

  return <Navigate to={dashboardPathByRole[role]} replace />;
};

export default RoleRedirect;
