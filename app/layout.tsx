import type { Metadata } from "next";
import { SiteChrome } from "@/components/SiteChrome";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Deck Sage",
  description: "Deck Sage website"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
