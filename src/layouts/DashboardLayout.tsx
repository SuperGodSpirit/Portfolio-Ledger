import { LogOut, WalletCards, LayoutDashboard, BarChart3, History, ArrowRightLeft, Shield, Menu, PieChart, Download } from "lucide-react";
import { useState, useRef, useEffect, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import RoleBadge from "../components/dashboard/RoleBadge";
import { useSessionTimeout } from "../hooks/useSessionTimeout";
import SessionTimeoutModal from "../components/ui/SessionTimeoutModal";

type DashboardLayoutProps = {
  title: string;
  subtitle: string;
  readOnly?: boolean;
  headerRight?: ReactNode;
  children: ReactNode;
};

const DashboardLayout = ({
  title,
  subtitle,
  readOnly = false,
  headerRight,
  children,
}: DashboardLayoutProps) => {
  const { ledgerUser, logout } = useAuth();
  const { showWarning, resetTimer, forceLogout } = useSessionTimeout();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const basePath = ledgerUser ? `/${ledgerUser.role}` : "";
  const navLinks = [
    { name: "Dashboard", to: basePath, icon: LayoutDashboard, exact: true },
    { name: "Analytics", to: `${basePath}/analytics`, icon: BarChart3 },
    { name: "History", to: `${basePath}/ipos`, icon: History },
    { name: "Settlements", to: `${basePath}/settlements`, icon: ArrowRightLeft },
  ];

  if (ledgerUser?.role === "owner" || ledgerUser?.role === "manager") {
    navLinks.push({ name: "Audit", to: `${basePath}/audit`, icon: Shield });
    navLinks.push({ name: "Admin Center", to: `${basePath}/admin`, icon: PieChart });
    navLinks.push({ name: "Reports & Export", to: `${basePath}/reports`, icon: Download });
  }

  return (
    <main className="min-h-screen bg-ledger-ink text-ledger-steel">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#12171c]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-4 sm:gap-6 sm:px-6">
          <div className="flex items-center gap-6">
            <Link
              to={ledgerUser ? `/${ledgerUser.role}` : "/"}
              className="flex items-center gap-4 transition hover:opacity-80"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded border border-ledger-line bg-[#0a0d11]">
                <WalletCards className="h-5 w-5 text-ledger-green" aria-hidden="true" />
              </div>
              <div className="hidden sm:block">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8793a3]">
                  Portfolio Ledger
                </p>
                <h1 className="text-xl font-semibold text-white tracking-tight">{title}</h1>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {ledgerUser && (
              <div className="relative z-50" ref={menuRef}>
                <Button type="button" variant="secondary" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                  <Menu className="h-4 w-4" />
                  <span className="hidden sm:inline">Menu</span>
                </Button>
                
                {isMenuOpen && (
                  <div className="absolute top-full right-0 mt-3 w-56 rounded border border-ledger-line bg-[#0a0d11] p-2 shadow-xl shadow-black/50">
                    <nav className="space-y-1">
                      {navLinks.map((link) => (
                        <NavLink
                          key={link.name}
                          to={link.to}
                          end={link.exact}
                          className={({ isActive }) =>
                            `flex items-center gap-3 rounded px-4 py-2.5 text-sm font-medium transition-colors ${
                              isActive
                                ? "bg-ledger-green/10 text-ledger-green"
                                : "text-[#8793a3] hover:bg-[#151a20] hover:text-white"
                            }`
                          }
                        >
                          <link.icon className="h-4 w-4" />
                          {link.name}
                        </NavLink>
                      ))}
                    </nav>
                    <div className="mt-4 border-t border-ledger-line pt-3 text-center">
                      <p className="text-[10px] uppercase tracking-widest text-[#8793a3]">Portfolio Ledger v{__APP_VERSION__}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            {ledgerUser && !readOnly && ledgerUser.role !== 'owner' && ledgerUser.role !== 'manager' ? <RoleBadge role={ledgerUser.role} /> : null}
            <Button type="button" variant="secondary" onClick={logout}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px]">
        <div className="flex-1 p-4 sm:p-6 md:p-8">
          <section className="mb-6 flex flex-col justify-between gap-4 border-b border-ledger-line pb-6 md:mb-8 md:flex-row md:items-end">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#8793a3]">{ledgerUser?.name}</p>
              <h2 className="text-3xl font-semibold text-white tracking-tight">{subtitle}</h2>
            </div>
            {headerRight && (
              <div className="mt-4 md:mt-0">
                {headerRight}
              </div>
            )}
          </section>
          {children}
        </div>
      </div>

      <SessionTimeoutModal
        isOpen={showWarning}
        onStayLoggedIn={resetTimer}
        onLogoutNow={forceLogout}
      />
    </main>
  );
};

export default DashboardLayout;
