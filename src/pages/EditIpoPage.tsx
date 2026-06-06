import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import IpoForm from "../components/ipo/IpoForm";
import Spinner from "../components/ui/Spinner";
import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { getIpoById, updateIpo } from "../services/ipoService";
import { getPortfolios } from "../services/portfolioService";
import type { IpoFormValues, IpoRecord } from "../types/ipo";
import type { Portfolio } from "../types/portfolio";

type EditIpoPageProps = {
  basePath: "/owner" | "/manager";
};

const titleByBasePath = {
  "/owner": "Owner Dashboard",
  "/manager": "Manager Dashboard",
} as const;

const EditIpoPage = ({ basePath }: EditIpoPageProps) => {
  const { ledgerUser } = useAuth();
  const { ipoId } = useParams();
  const navigate = useNavigate();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [ipo, setIpo] = useState<IpoRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPageData = async () => {
      if (!ipoId) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const [portfolioRecords, ipoRecord] = await Promise.all([
          getPortfolios(),
          getIpoById(ipoId),
        ]);

        setPortfolios(portfolioRecords);
        setIpo(ipoRecord);
      } catch {
        setError("Unable to load IPO record.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadPageData();
  }, [ipoId]);

  const initialValues = useMemo<IpoFormValues | undefined>(() => {
    if (!ipo) {
      return undefined;
    }

    return {
      ipoName: ipo.ipoName,
      portfolioId: ipo.portfolioId,
      portfolioName: ipo.portfolioName,
      allotmentDate: ipo.allotmentDate,
      lotValue: ipo.lotValue ?? null,
      status: ipo.status,
      memberEntries: ipo.memberEntries,
      calculationSnapshot: ipo.calculationSnapshot,
    };
  }, [ipo]);

  const handleSubmit = async (values: IpoFormValues) => {
    if (!ipoId) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (ledgerUser) {
        await updateIpo(ipoId, values, ledgerUser);
      }
      navigate(`${basePath}/ipos/${ipoId}`);
    } catch (err) {
      setError("Unable to update IPO record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!ipoId) {
    return <Navigate to={`${basePath}/ipos`} replace />;
  }

  if (isLoading) {
    return <Spinner label="Loading IPO record" />;
  }

  return (
    <DashboardLayout title={titleByBasePath[basePath]} subtitle="Edit IPO">
      {error ? (
        <div className="mb-5 rounded border border-[#5b3232] bg-[#2a1718] px-4 py-3 text-sm text-[#ffb5b5]">
          {error}
        </div>
      ) : null}
      {!initialValues ? (
        <section className="rounded border border-ledger-line bg-ledger-panel p-8 text-center">
          <h3 className="text-lg font-semibold text-white">IPO not found</h3>
        </section>
      ) : (
        <IpoForm
          portfolios={portfolios}
          initialValues={initialValues}
          submitLabel="Save IPO"
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        />
      )}
    </DashboardLayout>
  );
};

export default EditIpoPage;
