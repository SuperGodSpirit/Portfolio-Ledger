import { Navigate, Outlet } from "react-router-dom";
import Spinner from "../components/ui/Spinner";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types/user";

type ProtectedRouteProps = {
  allowedRoles: UserRole[];
};

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { firebaseUser, ledgerUser, isLoading } = useAuth();

  if (isLoading) {
    return <Spinner label="Checking access" />;
  }

  if (!firebaseUser) {
    return <Navigate to="/login" replace />;
  }

  if (!ledgerUser) {
    return <Navigate to="/login" replace />;
  }

  if (ledgerUser.status === "pending" || ledgerUser.role === "guest") {
    return <Navigate to="/pending" replace />;
  }

  if (ledgerUser.status === "deactivated" || ledgerUser.active === false) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(ledgerUser.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
