import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-ledger-ink text-ledger-steel py-10 px-6">
      <div className="mx-auto max-w-4xl">
        <Link to="/login" className="flex items-center gap-2 text-sm text-[#8793a3] hover:text-white transition mb-8 w-fit">
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </Link>
        
        <div className="rounded border border-ledger-line bg-ledger-panel p-8 md:p-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#8793a3] mb-2">Last Updated: June 2026 (v1.0)</p>
          <h1 className="text-3xl font-semibold text-white mb-8">Privacy Policy</h1>
          
          <div className="space-y-8 text-sm leading-relaxed text-[#9aa6b5]">
            
            <section>
              <h2 className="text-lg font-medium text-white mb-3">1. Information Collected</h2>
              <p>We collect and process the minimum amount of information necessary to operate the Portfolio Ledger platform. This includes Authentication Data (email address, unique user identifiers), Portfolio Data (mathematical inputs, ratios, and records you submit), Audit Logs (timestamps of your actions), and Notification Data.</p>
            </section>

            <section>
              <h2 className="text-lg font-medium text-white mb-3">2. Purpose of Processing</h2>
              <p>Data is processed strictly for: (a) Authentication and access control; (b) Providing mathematical analytics and reporting functionality; (c) Platform security, tracking, and auditability; and (d) delivering system notifications and alerts.</p>
            </section>

            <section>
              <h2 className="text-lg font-medium text-white mb-3">3. No Independent Verification</h2>
              <p>All information is stored exactly as submitted by the user. We do not independently verify the accuracy, legitimacy, or ownership of the underlying assets, accounts, or records represented by your data.</p>
            </section>

            <section>
              <h2 className="text-lg font-medium text-white mb-3">4. Security Practices & No Guarantee of Absolute Security</h2>
              <p>While we use industry-standard security protocols and third-party infrastructure (such as Google Firebase) to encrypt data in transit and at rest, no system is completely secure. We cannot and do not guarantee absolute security of your data. We specifically disclaim liability for unauthorized access, data breaches, or data loss to the maximum extent permitted by law.</p>
            </section>

            <section>
              <h2 className="text-lg font-medium text-white mb-3">5. Data Retention</h2>
              <p>We retain your Authentication Data, Portfolio Data, and Audit Logs for as long as your account is active, to provide you with continuous record-keeping and reporting services.</p>
            </section>

            <section>
              <h2 className="text-lg font-medium text-white mb-3">6. Data Deletion & User Rights</h2>
              <p>You may request account deletion at any time by contacting your portfolio administrator. Upon deletion, your personal account access will be terminated, and your personal portfolio data may be deleted from active systems. However, anonymized audit logs and historical records linked to shared group ledgers may be retained to preserve the mathematical integrity of the system for remaining users.</p>
            </section>

            <section>
              <h2 className="text-lg font-medium text-white mb-3">7. Contact Information</h2>
              <p>If you have any questions about this Privacy Policy, please contact your portfolio administrator.</p>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
