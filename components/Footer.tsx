import Link from "next/link";

const footerLinks = [
  { href: "/support", label: "Support" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-of-use", label: "Terms of Use" }
];

export function Footer() {
  return (
    <footer className="site-footer">
      <nav className="site-footer-links" aria-label="Footer navigation">
        {footerLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
      <p>&copy; 2026 Deck Sage. All rights reserved.</p>
    </footer>
  );
}
