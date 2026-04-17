import TrustPage from "./TrustPage";

export default function ContactPage() {
  return (
    <TrustPage title="Contact">
      <section>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Get in Touch</h2>
        <p>Have a question, found a bug, or want to collaborate? Reach out through any of the channels below.</p>
      </section>

      <section>
        <div className="flex flex-col gap-4">
          {[
            {
              icon: "👤",
              label: "Name",
              value: "Pranav Karpe",
              href: null,
            },
            {
              icon: "✉️",
              label: "Email",
              value: "karpepranav7@gmail.com",
              href: "mailto:karpepranav7@gmail.com",
            },
            {
              icon: "📞",
              label: "Phone",
              value: "+91 98812 65414",
              href: "tel:9881265414",
            },
            {
              icon: "💼",
              label: "LinkedIn",
              value: "linkedin.com/in/pranav-karpe-46b14528b",
              href: "https://www.linkedin.com/in/pranav-karpe-46b14528b/",
            },
          ].map(({ icon, label, value, href }) => (
            <div key={label} className="glass-card rounded-2xl px-5 py-4 flex items-center gap-4">
              <span className="text-2xl shrink-0">{icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
                {href ? (
                  <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer"
                    className="text-sm text-orange-500 hover:text-orange-600 transition-colors break-all">
                    {value}
                  </a>
                ) : (
                  <p className="text-sm text-gray-900 dark:text-white font-medium">{value}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Response Time</h2>
        <p>I typically respond to emails within 24–48 hours. For urgent issues, please mention "SentimentAI" in the subject line.</p>
      </section>
    </TrustPage>
  );
}
