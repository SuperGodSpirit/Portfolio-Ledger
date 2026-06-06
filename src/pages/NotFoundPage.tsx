import { Link } from "react-router-dom";
const NotFoundPage = () => (
  <main className="flex min-h-screen items-center justify-center bg-ledger-ink px-6 text-ledger-steel">
    <section className="w-full max-w-md rounded border border-ledger-line bg-ledger-panel p-7 shadow-ledger">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-ledger-green">
        Portfolio Ledger
      </p>
      <h1 className="mb-3 text-2xl font-semibold text-white">Page not found</h1>
      <p className="mb-6 text-sm leading-6 text-[#9aa6b5]">
        The requested route is not part of the Phase 1 application.
      </p>
      <Link
        to="/"
        className="inline-flex min-h-11 w-full items-center justify-center rounded border border-ledger-green bg-ledger-green px-4 text-sm font-semibold text-ledger-ink transition hover:bg-[#69e1a6]"
      >
        Return to dashboard
      </Link>
    </section>
  </main>
);

export default NotFoundPage;
