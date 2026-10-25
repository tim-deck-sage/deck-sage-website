import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Delete your Deck Sage account",
  description:
    "How to permanently delete a Deck Sage account and associated data.",
  alternates: {
    canonical: "https://deck-sage.com/delete-account/"
  }
};

export default function DeleteAccountPage() {
  return (
    <>
      <PageHero />
      <section className="page-content">
        <article className="legal-content">
          <h1>Delete your Deck Sage account</h1>
          <p className="effective-date">
            <strong>Last updated</strong>
            <span>October 10, 2026</span>
          </p>

          <section>
            <h2>Website accounts and retained beta collections</h2>
            <p>
              For a website account deletion request, contact Support using
              your verified recovery email. We verify ownership before deleting
              account information or collections. Do not send your password.
              The mobile-app steps below do not operate the website account.
              Old beta username-only collections are retained separately and
              are inaccessible through the website. Knowing a beta username
              alone does not establish ownership or authorize deletion.
            </p>
          </section>

          <section>
            <h2>Delete your account in the Deck Sage app</h2>
            <p>
              When you can access the app, use the secure in-app deletion
              process:
            </p>
            <p className="settings-path">
              Settings &gt; Account &amp; Subscription &gt; Delete Account
            </p>
            <p>
              Review the deletion information, enter your current password,
              type <code>DELETE</code> exactly, and choose{" "}
              <strong>Permanently Delete Account</strong>. The process requires
              a recent authenticated session.
            </p>
            <div className="legal-callout legal-callout-danger">
              <p>
                Deletion begins immediately after the secure confirmation
                succeeds. Account deletion is permanent and cannot be undone.
              </p>
            </div>
            <p>
              Visiting this page or contacting Support does not delete your
              account.
            </p>
          </section>

          <section>
            <h2>What is deleted</h2>
            <p>Deleting your Deck Sage account removes:</p>
            <ul>
              <li>Your Deck Sage profile and account information</li>
              <li>Your username reservation</li>
              <li>Your decks and saved card information</li>
              <li>
                Your bulk card collection and saved Deck Blueprint or Bulk
                Analysis reports
              </li>
              <li>Your friend connections and direct social relationships</li>
              <li>
                Your notification preferences, account notifications, and push
                token associations
              </li>
              <li>Your direct entitlement and account usage state</li>
              <li>
                Your store memberships and account-specific store preferences
              </li>
              <li>
                Account-related local files, credentials, cached data, and
                synced device state after deletion succeeds
              </li>
            </ul>
          </section>

          <section>
            <h2>What may remain in anonymous form</h2>
            <p>
              Limited shared or operational records may remain without
              identifying account information:
            </p>
            <ul>
              <li>
                Shared Connected Play history may remain for other participants,
                with you shown as <strong>Deleted Player</strong>.
              </li>
              <li>
                Anonymous store accounting or rewards records, entitlement
                reconciliation events, aggregated analytics, and anti-abuse or
                audit records may remain when operationally necessary.
              </li>
              <li>
                Temporary, de-identified deletion-job records are generally
                eligible for purge within 30 days. A job requiring operational
                attention may remain until it can be safely resolved.
              </li>
              <li>
                Provider backups and infrastructure logs age out under each
                provider&apos;s configured retention schedule.
              </li>
            </ul>
            <p>
              Direct identifying account information is removed from retained
              records covered by the deletion process. Your former email address
              and username may be used to register again, but a new registration
              creates a new account and does not restore deleted data.
            </p>
          </section>

          <section>
            <h2>Subscriptions are separate</h2>
            <div className="legal-callout">
              <p>
                Deleting your Deck Sage account does not cancel an Apple App
                Store or Google Play subscription. Apple- and Google-controlled
                transaction records are not deleted by Deck Sage.
              </p>
            </div>
            <p>
              Manage or cancel your store subscription separately. In Deck Sage,
              go to:
            </p>
            <p className="settings-path">
              Settings &gt; Account &amp; Subscription &gt; Manage or Cancel
              Subscription
            </p>
            <p>
              You may also use{" "}
              <a href="https://apps.apple.com/account/subscriptions">
                Apple&apos;s Manage Subscriptions page
              </a>{" "}
              or{" "}
              <a href="https://play.google.com/store/account/subscriptions">
                Google Play&apos;s Manage Subscriptions page
              </a>
              . Canceling renewal normally allows paid access through the
              current billing period.
            </p>
          </section>

          <section>
            <h2>Store Owner accounts</h2>
            <p>
              A Deck Sage Store Owner must transfer or close the store before
              deleting the account. Account deletion is blocked until store
              ownership is resolved, and no account data is deleted when the
              Store Owner blocker is returned.
            </p>
            <p>
              Contact{" "}
              <a href="https://deck-sage.com/support/">Deck Sage Support</a> if
              you need help resolving store ownership.
            </p>
          </section>

          <section>
            <h2>If you cannot access the app</h2>
            <p>
              Visit the{" "}
              <a href="https://deck-sage.com/support/">
                Deck Sage Support page
              </a>{" "}
              or email{" "}
              <a href="mailto:support@deck-sage.com">
                support@deck-sage.com
              </a>{" "}
              to request account-deletion assistance.
            </p>
            <p>
              Deck Sage verifies account ownership before processing deletion.
              Possession or knowledge of an email address alone is not enough.
              Support may request non-sensitive information reasonably connected
              to the account.
            </p>
            <div className="legal-callout">
              <p>
                Do not email passwords, authentication tokens, one-time codes,
                receipts, or other sensitive credentials.
              </p>
            </div>
            <p>
              Sending an email or support request is not completed deletion.
              After successful verification, Support uses the same secure
              deletion process.
            </p>
          </section>

          <section>
            <h2>Privacy and contact information</h2>
            <p>
              Read the{" "}
              <a href="https://deck-sage.com/privacy-policy/">
                Deck Sage Privacy Policy
              </a>{" "}
              and{" "}
              <a href="https://deck-sage.com/terms-of-use/">
                Deck Sage Terms of Use
              </a>
              . For help, visit{" "}
              <a href="https://deck-sage.com/support/">
                Deck Sage Support
              </a>{" "}
              or email{" "}
              <a href="mailto:support@deck-sage.com">
                support@deck-sage.com
              </a>
              .
            </p>
          </section>
        </article>
      </section>
    </>
  );
}
