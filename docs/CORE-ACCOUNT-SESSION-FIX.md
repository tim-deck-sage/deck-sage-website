# Focused correction after the first verified signup

Read-only production evidence: the approved tim@deck-sage.com Auth account exists,
is permanent and email-confirmed, and has no Core profile/workspace yet. The open
Edge page was the retained root username-only interface. The secure test page had
no current session. Username-only login cannot find an account whose verified
onboarding has not yet assigned its Core username. No account or data was removed.
The original email callback navigation is no longer available, so its exact
history is not inferred from the final page alone.

Corrections:

- Allow username **or email** in sign-in. Email/password goes directly to native
  Supabase Auth with the same real CAPTCHA token; after password authentication,
  the adapter still verifies the exact token through Auth and requires a
  confirmed, nonanonymous matching identity. No email lookup/enumeration API or
  custom password storage is added. A verified user with no profile resumes the
  existing expected-owner onboarding RPC. Username sign-in is unchanged.
- Route the reserved root `?accountCallback=1` callback to the fixed test path
  without requiring a previously saved rollout marker. Ordinary root navigation
  stays on the retained baseline app. No redirect allowlist change, arbitrary
  destination, token logging or CAPTCHA relaxation.
- Native session/PKCE storage is shared across tabs for a browser session. Values
  are AES-GCM encrypted, bound to their storage-key names, in local browser
  storage. The random encryption key lives only in a host-only Secure session
  cookie with no Expires or Max-Age. No bearer/refresh token is put in a cookie.
  Closing a browser normally loses that key; a browser's session-restore feature
  may restore session cookies, which websites cannot reliably distinguish from
  an uninterrupted browser session. Sign out explicitly ends access. The UI
  explains this limit. Exact obsolete SDK credential entries are retired; beta
  collections and caches are preserved.
- A real SDK/browser test exposed overlapping PASSWORD_RECOVERY and
  INITIAL_SESSION events. Recovery intent is now recorded before asynchronous
  verification, and applied only after verifying the matching owner. A mismatched
  event, logout, failed verification or account switch clears that intent.

Completed synthetic/local tests: nine browser-session storage groups; eleven
native SDK/HTTP groups; twelve controller groups, including overlapping recovery
events; fixed callback route tests; real SDK/browser verified onboarding,
navigation/refresh, another-tab session sharing, cross-tab logout, session-cookie
loss, PKCE reset wiring and missing-verifier denial. Public/protected navigation
and leading-zero ZIP inputs remain covered. These are local fixtures, not proof
of live mail delivery or the pending two-user hosted test.

Publication is restricted to the temporary test path. The main application
cutover remains blocked until actual hosted login, owner/cross-user access,
logout and recovery pass. Tim should sign in with his existing verified email
and existing password to finish setup, not repeat signup or reset his password
as a workaround. Password entry stays in the browser through user handoff.
