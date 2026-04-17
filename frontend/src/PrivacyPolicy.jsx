import TrustPage from "./TrustPage";

export default function PrivacyPolicy() {
  return (
    <TrustPage title="Privacy Policy">
      <section>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Data Collection</h2>
        <p>SentimentAI collects only the data necessary to provide the service: your name, email, and the text you analyze. We do not sell, share, or distribute your data to third parties.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">How We Use Your Data</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Authentication:</strong> Your email and password (hashed) are stored securely in MongoDB Atlas to enable login.</li>
          <li><strong>Analysis History:</strong> Text you analyze is saved to your account so you can view past results, charts, and export reports.</li>
          <li><strong>Session Management:</strong> JWT tokens are used to keep you logged in for 48 hours. Tokens expire automatically.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Data Security</h2>
        <p>All passwords are hashed using industry-standard algorithms (Werkzeug). Data is transmitted over HTTPS. MongoDB Atlas provides encryption at rest and in transit.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Your Rights</h2>
        <p>You can delete any analysis from your history at any time. If you wish to delete your account entirely, contact us at <a href="mailto:karpepranav7@gmail.com" className="text-orange-500 hover:underline">karpepranav7@gmail.com</a>.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Cookies</h2>
        <p>We use localStorage to store your theme preference (dark/light mode), authentication token, and last activity timestamp. No third-party cookies are used.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Changes to This Policy</h2>
        <p>We may update this policy from time to time. Continued use of the service after changes constitutes acceptance of the updated policy.</p>
      </section>
    </TrustPage>
  );
}
