import { PageHero } from "@/components/PageHero";

export default function PrivacyPolicyPage() {
  return (
    <>
      <PageHero />
      <section className="page-content">
        <article className="legal-content">
          <h2>Privacy Policy</h2>
          <p className="effective-date">
            <strong>Effective Date</strong>
            <span>July 4, 2026</span>
          </p>

          <section>
            <p>Deck Sage respects your privacy.</p>
            <p>
              This Privacy Policy explains how information is collected and used
              when you use the Deck Sage mobile application.
            </p>
          </section>

          <section>
            <h3>Information We Collect</h3>
            <p>Depending on the features you use, Deck Sage may collect:</p>
            <ul>
              <li>Account information</li>
              <li>Username</li>
              <li>Email address</li>
              <li>Device information necessary to operate the application</li>
              <li>Deck and collection data you choose to store</li>
              <li>
                Store check-in information when participating in supported store
                features
              </li>
            </ul>
          </section>

          <section>
            <h3>How We Use Your Information</h3>
            <p>We use collected information to:</p>
            <ul>
              <li>Provide application features</li>
              <li>Synchronize your account across devices</li>
              <li>Improve application performance</li>
              <li>Respond to support requests</li>
              <li>Maintain account security</li>
            </ul>
          </section>

          <section>
            <h3>Data Sharing</h3>
            <p>Deck Sage does not sell your personal information.</p>
            <p>
              Information is shared only when necessary to provide services or
              when required by law.
            </p>
          </section>

          <section>
            <h3>Data Security</h3>
            <p>
              We take reasonable measures to protect your information using
              industry-standard security practices.
            </p>
          </section>

          <section>
            <h3>Children&apos;s Privacy</h3>
            <p>
              Deck Sage is not intended for children under 13 years of age.
            </p>
          </section>

          <section>
            <h3>Changes</h3>
            <p>This Privacy Policy may be updated periodically.</p>
            <p>Any changes will be reflected on this page.</p>
          </section>

          <section>
            <h3>Contact</h3>
            <p>Questions regarding privacy may be sent to:</p>
            <p>
              <a href="mailto:support@deck-sage.com">support@deck-sage.com</a>
            </p>
          </section>
        </article>
      </section>
    </>
  );
}
