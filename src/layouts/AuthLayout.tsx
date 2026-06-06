import type { ReactNode } from "react";
import { ShieldCheck, Lock, Activity } from "lucide-react";

const AuthLayout = ({ children }: { children: ReactNode }) => (
  <main className="min-h-screen bg-ledger-ink text-ledger-steel">
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-14">
        <div className="w-full max-w-md">{children}</div>
      </section>
      <aside className="relative hidden overflow-hidden border-l border-ledger-line bg-[linear-gradient(145deg,#151a1f_0%,#192028_55%,#101418_100%)] p-10 lg:flex lg:flex-col lg:justify-between">
        {/* Abstract Background Elements */}
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-ledger-green/5 blur-[120px]" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-blue-500/5 blur-[120px]" />
        
        <div className="relative z-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-ledger-green">
            Institutional Grade
          </p>
          <h1 className="max-w-xl text-4xl font-semibold leading-tight text-white lg:text-5xl">
            Portfolio Ledger
          </h1>
          <p className="mt-4 text-sm text-[#8793a3] max-w-sm leading-relaxed">
            A strictly confidential organizational system designed exclusively for managed private investment groups.
          </p>
        </div>
        
        <div className="relative z-10 grid gap-4">
          <div className="flex items-center gap-4 rounded-lg border border-ledger-line/50 bg-[#11161d]/80 backdrop-blur-md p-5 transition-colors hover:bg-[#11161d]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ledger-green/10">
              <ShieldCheck className="h-5 w-5 text-ledger-green" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Role-Based Security</p>
              <p className="text-xs text-[#8793a3] mt-0.5">Strict authorization tiers and protected access.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 rounded-lg border border-ledger-line/50 bg-[#11161d]/80 backdrop-blur-md p-5 transition-colors hover:bg-[#11161d]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
              <Lock className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Encrypted Storage</p>
              <p className="text-xs text-[#8793a3] mt-0.5">All financial data is encrypted at rest and in transit.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-lg border border-ledger-line/50 bg-[#11161d]/80 backdrop-blur-md p-5 transition-colors hover:bg-[#11161d]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500/10">
              <Activity className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Immutable Audit Trails</p>
              <p className="text-xs text-[#8793a3] mt-0.5">Comprehensive tracking of all system mutations.</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </main>
);

export default AuthLayout;
