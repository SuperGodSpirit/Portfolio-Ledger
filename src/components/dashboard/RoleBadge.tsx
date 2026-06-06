import type { UserRole } from "../../types/user";

const labelByRole: Record<UserRole, string> = {
  owner: "Owner",
  manager: "Manager",
  viewer: "Viewer",
};

const RoleBadge = ({ role }: { role: UserRole }) => (
  <span className="rounded border border-ledger-line bg-ledger-panel px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ledger-green">
    {labelByRole[role]}
  </span>
);

export default RoleBadge;
