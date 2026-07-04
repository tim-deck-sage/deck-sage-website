"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Navigation } from "@/components/Navigation";

export function SiteChrome({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isHomePage = usePathname() === "/";

  return (
    <div className="site-shell">
      <Navigation />
      <main className="site-main">{children}</main>
      {!isHomePage && <Footer />}
    </div>
  );
}
