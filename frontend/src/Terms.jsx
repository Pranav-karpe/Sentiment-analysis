import TrustPage from "./TrustPage";

export default function Terms() {
  return (
    <TrustPage title="Terms of Service">
      <section>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Acceptance of Terms</h2>
        <p>By accessing or using SentimentAI, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Use of Service</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>You may use SentimentAI for personal, educational, or commercial purposes.</li>
          <li>You must not use the service to analyze illegal, harmful, or abusive content.</li>
          <li>You must not attempt to reverse-engineer, hack, or disrupt the service.</li>
          <li>You are responsible for the content you upload and analyze.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Account Responsibilities</h2>
        <p>You are responsible for maintaining the confidentiality of your account credentials. Notify us immediately if you suspect unauthorized access.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Disclaimer</h2>
        <p>SentimentAI provides sentiment analysis predictions based on a machine learning model. Results are not guaranteed to be 100% accurate. The service is provided "as is" without warranties of any kind.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Limitation of Liability</h2>
        <p>SentimentAI and its creators are not liable for any damages arising from the use or inability to use the service, including but not limited to incorrect predictions, data loss, or service interruptions.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Termination</h2>
        <p>We reserve the right to suspend or terminate accounts that violate these terms or engage in abusive behavior.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Changes to Terms</h2>
        <p>We may modify these terms at any time. Continued use after changes constitutes acceptance of the updated terms.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Contact</h2>
        <p>For questions about these terms, contact <a href="mailto:karpepranav7@gmail.com" className="text-orange-500 hover:underline">karpepranav7@gmail.com</a>.</p>
      </section>
    </TrustPage>
  );
}
