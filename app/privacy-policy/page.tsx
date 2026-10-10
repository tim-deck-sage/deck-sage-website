import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Deck Sage Privacy Policy",
  description:
    "How Deck Sage collects, uses, protects, retains, and deletes account information.",
  alternates: {
    canonical: "https://deck-sage.com/privacy-policy/"
  }
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <PageHero />
      <section className="page-content">
        <article className="legal-content">
          <h1>Privacy Policy</h1>
          <p className="effective-date">
            <strong>Last updated</strong>
            <span>October 10, 2026</span>
          </p>

          <section>
            <p>Deck Sage respects your privacy.</p>
            <p>
              This Privacy Policy explains how information is collected, used,
              retained, and deleted when you use the Deck Sage mobile
              application or public website.
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
            <h2>Website shared username storage</h2>
            <p>
              On the public website, a shared username is the only key to its
              website collection. Anyone who knows or guesses that username can
              view, change, or delete the decks and bulk stored under it. The
              website does not use an email address, password, recovery code,
              or private account ownership for this feature.
            </p>
            <p>
              Website shared username collections are stored centrally through
              Supabase so the same collection can open in another browser or
              device after the username is entered. They remain separate from
              authenticated mobile-app accounts and private app records.
            </p>
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
            <h2>Service providers</h2>
            <p>
              Deck Sage uses service providers only for functions needed to
              operate and improve the app and website:
            </p>
            <ul>
              <li>
                Supabase provides account authentication, database, file
                storage, and secure server-side account operations.
              </li>
              <li>
                RevenueCat supports subscription entitlement and purchase-state
                management.
              </li>
              <li>
                Apple and Google process store subscriptions and maintain
                transaction records they control.
              </li>
              <li>
                Expo supports app delivery, updates, notifications, and related
                application services.
              </li>
              <li>
                OpenAI supports AI-assisted features when those features are
                used.
              </li>
            </ul>
            <p>
              These providers handle information under their own service terms
              and retention practices. Deck Sage does not control a user&apos;s
              Apple ID, Google account, or Apple- and Google-controlled
              transaction records.
            </p>
          </section>

          <section>
            <h2>Account deletion</h2>
            <p>
              Signed-in users can start permanent account deletion in the app
              at:
            </p>
            <p className="settings-path">
              Settings &gt; Account &amp; Subscription &gt; Delete Account
            </p>
            <p>
              The secure process requires the current password, the exact typed
              confirmation <code>DELETE</code>, and a recent authenticated
              session. Read the{" "}
              <a href="https://deck-sage.com/delete-account/">
                Deck Sage account-deletion information
              </a>{" "}
              for complete instructions.
            </p>
            <p>
              A Store Owner must transfer or close the store before deleting the
              account. Deletion is blocked until ownership is resolved, and no
              account data is deleted when that blocker is returned.
            </p>
          </section>

          <section>
            <h2>Information deleted with an account</h2>
            <p>Account deletion removes major categories including:</p>
            <ul>
              <li>Profile, account information, and username reservation</li>
              <li>Decks, saved card information, and bulk card collection</li>
              <li>Saved Deck Blueprint and Bulk Analysis reports</li>
              <li>Friend connections and direct social relationships</li>
              <li>
                Notification preferences, account notifications, and push-token
                associations
              </li>
              <li>Direct entitlement and account usage state</li>
              <li>
                Store memberships and account-specific store preferences
              </li>
              <li>
                Account-related local files, credentials, caches, and synced
                device state after deletion succeeds
              </li>
            </ul>
            <p>
              A former email address and username may be used to register again.
              A new registration creates a new account and does not restore
              deleted data.
            </p>
          </section>

          <section>
            <h2>Anonymous and provider-controlled retention</h2>
            <p>
              Limited shared or operational records may remain without
              identifying account information. Shared Connected Play history
              may remain for other participants with the deleted participant
              shown as <strong>Deleted Player</strong>.
            </p>
            <p>
              Anonymous store accounting or rewards records, entitlement
              reconciliation events, aggregated analytics, anti-abuse signals,
              and audit records may remain when operationally necessary. Direct
              identifying account information is removed from retained records
              covered by the deletion process.
            </p>
            <p>
              Temporary, de-identified deletion-job records are generally
              eligible for purge within 30 days. A job requiring operational
              attention may remain until it can be safely resolved. Provider
              backups and infrastructure logs age out under each provider&apos;s
              configured retention schedule.
            </p>
          </section>

          <section>
            <h2>Subscriptions and transaction records</h2>
            <p>
              Deleting a Deck Sage account does not cancel an Apple App Store or
              Google Play subscription. Users must manage or cancel store
              subscriptions separately. Apple- and Google-controlled
              transaction records are not deleted by Deck Sage.
            </p>
          </section>

          <section>
            <h2>Support-assisted deletion</h2>
            <p>
              If you cannot access the app, visit{" "}
              <a href="https://deck-sage.com/support/">Deck Sage Support</a> or
              email{" "}
              <a href="mailto:support@deck-sage.com">
                support@deck-sage.com
              </a>
              . Deck Sage verifies account ownership before processing
              deletion. Knowledge or control of an email address alone is not
              sufficient proof.
            </p>
            <p>
              Do not send passwords, authentication tokens, one-time codes,
              receipts, or sensitive credentials by email. Sending an email or
              support request is not completed deletion. After successful
              verification, Support uses the same secure deletion process.
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
