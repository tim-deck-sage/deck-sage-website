"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationLinks = [
  { href: "/", label: "Home" },
  { href: "/support", label: "Support" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-of-use", label: "Terms of Use" }
];

function normalizePath(pathname: string) {
  return pathname === "/" ? pathname : pathname.replace(/\/$/, "");
}

export function Navigation() {
  const pathname = normalizePath(usePathname());

  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="Primary navigation">
        <Link className="site-brand" href="/">
          Deck Sage
        </Link>
        <div className="site-nav-links">
          {navigationLinks.map((link) => {
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                className="site-nav-link"
                data-active={isActive ? "true" : undefined}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
