import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const TermsConditionsPage = () => {
  return (
    <div className="min-h-screen bg-ledger-ink text-ledger-steel py-10 px-6">
      <div className="mx-auto max-w-3xl">
        <Link to="/login" className="flex items-center gap-2 text-sm text-[#8793a3] hover:text-white transition mb-8 w-fit">
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </Link>
        
        <div className="rounded border border-ledger-line bg-ledger-panel p-8 md:p-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#8793a3] mb-2">Last Updated: June 2026</p>
          <h1 className="text-3xl font-semibold text-white mb-8">Terms & Conditions</h1>
          
          <div className="space-y-8 text-sm leading-relaxed text-[#9aa6b5]">
            
            <section>
              <h2 className="text-lg font-medium text-white mb-3">1. Platform Purpose</h2>
              <p>Portfolio Ledger is provided strictly as an organizational and record-keeping tool. It is designed to assist private investment groups in tracking Initial Public Offering (IPO) allotments, calculating entitlements, and organizing inter-member settlement instructions.</p>
            </section>

            <section>
              <h2 className="text-lg font-medium text-white mb-3">2. User Eligibility & Authorized Access</h2>
              <p>Access to Portfolio Ledger is by invitation only. By accessing the platform, you represent that you have been explicitly authorized by a portfolio administrator (Owner or Manager). Unauthorized access, reverse engineering, or scraping of the platform is strictly prohibited.</p>
            </section>

            <section>
              <h2 className="text-lg font-medium text-white mb-3">3. User Responsibilities & Data Accuracy</h2>
              <p>Users are solely responsible for ensuring the accuracy of any data they input into the system, including applied amounts, allotted lots, and final bank credits. The platform processes calculations based entirely on user-provided inputs. The operators of Portfolio Ledger do not independently verify the accuracy of this data.</p>
            </section>

            <section>
              <h2 className="text-lg font-medium text-white mb-3">4. Settlement Calculations & Verification</h2>
              <p>The settlement engine generates instructions indicating amounts owed between members. These calculations are provided as operational assistance only. <strong>Users remain wholly responsible for validating all financial figures.</strong> Users must manually verify amounts before executing any actual financial transfers outside of the platform.</p>
            </section>

            <section>
              <h2 className="text-lg font-medium text-white mb-3">5. Not Financial Advice</h2>
              <p>Nothing presented on the Portfolio Ledger platform constitutes investment, financial, tax, legal, or accounting advice. The platform does not recommend or endorse any specific IPOs, securities, or financial strategies.</p>
            </section>

            <section>
              <h2 className="text-lg font-medium text-white mb-3">6. Limitation of Liability & Data Loss Disclaimer</h2>
              <p>To the maximum extent permitted by applicable law, the operators, developers, and administrators of Portfolio Ledger shall not be liable for any direct, indirect, incidental, consequential, or special damages. This includes, but is not limited to, financial losses resulting from incorrect inputs, miscalculations, user mistakes, platform outages, data loss, or unauthorized misuse of the application.</p>
            </section>

            <section>
              <h2 className="text-lg font-medium text-white mb-3">7. Service Availability & Audit Logging</h2>
              <p>We do not guarantee that the service will be uninterrupted, secure, or error-free. The platform utilizes audit logging to track system events (such as logins, data modifications, and settlements) to maintain systemic integrity. These logs may be retained indefinitely.</p>
            </section>

            <section>
              <h2 className="text-lg font-medium text-white mb-3">8. Account Suspension & Access Revocation</h2>
              <p>Administrators (Owners and Managers) reserve the right to suspend or revoke any user's access to the platform at any time, without prior notice, for any reason—including but not limited to violations of these Terms & Conditions or termination of portfolio membership.</p>
            </section>

            <section>
              <h2 className="text-lg font-medium text-white mb-3">9. Modifications & Governing Terms</h2>
              <p>We reserve the right to modify these Terms & Conditions at any time. Your continued use of the platform constitutes your agreement to be bound by the modified Terms. These Terms govern your use of the platform and supersede any prior agreements.</p>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsConditionsPage;
