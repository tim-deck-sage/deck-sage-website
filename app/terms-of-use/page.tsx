import { PageHero } from "@/components/PageHero";

export default function TermsOfUsePage() {
  return (
    <>
      <PageHero />
      <section className="page-content">
        <article className="legal-content">
          <h2>Terms of Use</h2>
          <p className="effective-date">
            <strong>Effective Date</strong>
            <span>July 4, 2026</span>
          </p>

          <section>
            <p>By using Deck Sage, you agree to these Terms of Use.</p>
          </section>

          <section>
            <h3>Acceptable Use</h3>
            <p>
              You agree to use Deck Sage responsibly and in accordance with
              applicable laws.
            </p>
            <p>
              You may not attempt to interfere with the operation or security of
              the application.
            </p>
          </section>

          <section>
            <h3>Accounts</h3>
            <p>Certain features require a Deck Sage account.</p>
            <p>
              You are responsible for maintaining the security of your account
              credentials.
            </p>
          </section>

          <section>
            <h3>Intellectual Property</h3>
            <p>
              Deck Sage and its original software, artwork, branding, and
              content are protected by applicable intellectual property laws.
            </p>
            <p>
              Magic: The Gathering is a trademark of Wizards of the Coast LLC.
              Deck Sage is an independent companion application and is not
              affiliated with, endorsed by, or sponsored by Wizards of the Coast
              LLC.
            </p>
          </section>

          <section>
            <h3>Availability</h3>
            <p>
              We strive to keep Deck Sage available at all times but cannot
              guarantee uninterrupted service.
            </p>
            <p>Features may change or be updated without notice.</p>
          </section>

          <section>
            <h3>Limitation of Liability</h3>
            <p>Deck Sage is provided &quot;as is&quot; without warranties of any kind.</p>
            <p>
              To the fullest extent permitted by law, Deck Sage shall not be
              liable for indirect, incidental, or consequential damages arising
              from the use of the application.
            </p>
          </section>

          <section>
            <h3>Changes to These Terms</h3>
            <p>These Terms may be updated periodically.</p>
            <p>
              Continued use of Deck Sage constitutes acceptance of any revised
              Terms.
            </p>
          </section>

          <section>
            <h3>Contact</h3>
            <p>Questions regarding these Terms may be sent to:</p>
            <p>
              <a href="mailto:support@deck-sage.com">support@deck-sage.com</a>
            </p>
          </section>
        </article>
      </section>
    </>
  );
}
