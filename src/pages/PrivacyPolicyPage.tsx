import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-ledger-ink text-ledger-steel py-10 px-6">
      <div className="mx-auto max-w-3xl">
        <Link to="/login" className="flex items-center gap-2 text-sm text-[#8793a3] hover:text-white transition mb-8 w-fit">
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </Link>
        
        <div className="rounded border border-ledger-line bg-ledger-panel p-8 md:p-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#8793a3] mb-2">Last Updated: June 2026</p>
          <h1 className="text-3xl font-semibold text-white mb-8">Privacy Policy</h1>
          
          <div className="space-y-8 text-sm leading-relaxed text-[#9aa6b5]">
            
            <section>
              <h2 className="text-lg font-medium text-white mb-3">1. Information Collected</h2>
              <p>We collect and process the minimum amount of information necessary to operate the Portfolio Ledger platform. This includes personal identifiers (such as names and email addresses) and financial allocation records associated with the portfolios you manage or belong to.</p>
            </section>

            <section>
              <h2 className="text-lg font-medium text-white mb-3">2. Authentication Data</h2>
              <p>Authentication is handled securely via Firebase Authentication. We do not store your raw passwords on our servers. Your email address and unique user identifier (UID) are retained to verify your identity, authorize access, and associate you with your specific portfolio roles.</p>
            </section>

            <section>
              <h2 className="text-lg font-medium text-white mb-3">3. Portfolio and Settlement Data</h2>
              <p>As a core operational function, the platform stores records of Initial Public Offering (IPO) allocations, applied values, allotted values, and calculated settlement instructions between members. This data is visible strictly to authorized personnel (Owners, Managers, and the respective Viewers of that portfolio).</p>
            </section>

            <section>
              <h2 className="text-lg font-medium text-white mb-3">4. Audit Logs</h2>
              <p>To ensure organizational integrity, we automatically record system events, including user logins, IPO creation, modifications, archival, and settlement status changes. These audit logs record the timestamp, event type, and the identity of the user who performed the action.</p>
            </section>

            <section>
              <h2 className="text-lg font-medium text-white mb-3">5. Data Storage & Security Practices</h2>
              <p>Your data is encrypted in transit and at rest using industry-standard protocols provided by Google Cloud Platform and Firebase. Access controls (Firestore Security Rules) are strictly enforced to prevent unauthorized data reads or modifications across different privilege tiers.</p>
            </section>

            <section>
              <h2 className="text-lg font-medium text-white mb-3">6. Third-Party Services</h2>
              <p>We utilize third-party services, explicitly Google Firebase, to host the application, manage the database (Firestore), and authenticate users. By using the platform, you acknowledge that your data is processed by these third-party infrastructure providers under their respective privacy policies.</p>
            </section>

            <section>
              <h2 className="text-lg font-medium text-white mb-3">7. User Responsibilities</h2>
              <p>You are responsible for maintaining the confidentiality of your login credentials. You agree not to share your account access with unauthorized individuals. If you suspect your account has been compromised, you must notify a portfolio Manager or Owner immediately.</p>
            </section>

            <section>
              <h2 className="text-lg font-medium text-white mb-3">8. Data Retention & Access Revocation</h2>
              <p>Data regarding IPOs, settlements, and audit logs may be retained indefinitely for operational and record-keeping purposes, even if your account is suspended or deleted. Access to the platform may be revoked at any time by an Owner or Manager at their sole discretion.</p>
            </section>

            <section>
              <h2 className="text-lg font-medium text-white mb-3">9. Changes to Policy</h2>
              <p>We may update this Privacy Policy periodically to reflect changes in our operational practices. Substantive changes will be communicated via the platform. Continued use of the platform after updates constitutes acceptance of the revised policy.</p>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
