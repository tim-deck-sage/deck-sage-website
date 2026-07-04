import { PageHero } from "@/components/PageHero";

export default function SupportPage() {
  return (
    <>
      <PageHero />
      <section className="page-content">
        <article className="legal-content">
          <h2>Support</h2>

          <section>
            <h3>Need help with Deck Sage?</h3>
            <p>
              We&apos;re here to help. Whether you&apos;re experiencing a
              technical issue, have a question about the app, or want to report
              a bug, we&apos;re happy to assist.
            </p>
          </section>

          <section>
            <h3>Contact Support</h3>
            <div className="contact-list">
              <p>
                <strong>General Support</strong>
                <a href="mailto:support@deck-sage.com">
                  support@deck-sage.com
                </a>
              </p>
              <p>
                <strong>Technical Support</strong>
                <a href="mailto:help@deck-sage.com">help@deck-sage.com</a>
              </p>
            </div>
          </section>

          <section>
            <h3>Response Time</h3>
            <p>We typically respond within 1-2 business days.</p>
            <p>Please include:</p>
            <ul>
              <li>Your device model</li>
              <li>Operating system version</li>
              <li>A description of the issue</li>
              <li>Screenshots if available</li>
            </ul>
          </section>

          <section>
            <h3>Bug Reports</h3>
            <p>
              If you&apos;ve discovered a bug or unexpected behavior, we&apos;d
              love to hear about it. Your feedback helps us improve Deck Sage
              for everyone.
            </p>
          </section>

          <section>
            <h3>Feature Requests</h3>
            <p>
              Have an idea for a new feature? Send it to us! Many of the best
              ideas come directly from the Magic community.
            </p>
          </section>
        </article>
      </section>
    </>
  );
}
