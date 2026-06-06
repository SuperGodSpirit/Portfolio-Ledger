import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import IpoForm from "../components/ipo/IpoForm";
import Spinner from "../components/ui/Spinner";
import { useAuth } from "../context/AuthContext";
import DashboardLayout from "../layouts/DashboardLayout";
import { createIpo } from "../services/ipoService";
import { getPortfolios } from "../services/portfolioService";
import type { IpoFormValues } from "../types/ipo";
import type { Portfolio } from "../types/portfolio";

type AddIpoPageProps = {
  basePath: "/owner" | "/manager";
};

const titleByBasePath = {
  "/owner": "Owner Dashboard",
  "/manager": "Manager Dashboard",
} as const;

const AddIpoPage = ({ basePath }: AddIpoPageProps) => {
  const { ledgerUser } = useAuth();
  const navigate = useNavigate();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPortfolios = async () => {
      setIsLoading(true);

      try {
        setPortfolios(await getPortfolios());
      } catch {
        setError("Unable to load portfolios.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadPortfolios();
  }, []);

  const handleSubmit = async (values: IpoFormValues) => {
    if (!ledgerUser) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createIpo(values, ledgerUser);
      navigate(`${basePath}/ipos`);
    } catch {
      setError("Unable to create IPO record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <Spinner label="Loading portfolios" />;
  }

  return (
    <DashboardLayout title={titleByBasePath[basePath]} subtitle="Add IPO">
      {error ? (
        <div className="mb-5 rounded border border-[#5b3232] bg-[#2a1718] px-4 py-3 text-sm text-[#ffb5b5]">
          {error}
        </div>
      ) : null}
      <IpoForm
        portfolios={portfolios}
        submitLabel="Create IPO"
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
    </DashboardLayout>
  );
};

export default AddIpoPage;
