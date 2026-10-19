import type { Metadata } from "next";
import LaocoonChrome from "@/components/LaocoonChrome";
import SiteLayoutWrapper from "@/components/SiteLayoutWrapper";
import "./globals.css";

export const metadata: Metadata = {
  title: "HAHA — Humans Are Hard to Automate",
  description:
    "Tell a joke that fools the AI and get paid. An open comedy club & AI lab where people stump the Straight Man AI, verified by a human crowd.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=JetBrains+Mono:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased font-sans bg-[#060606] text-[#f4f4f5]">
        <LaocoonChrome />
        <SiteLayoutWrapper>{children}</SiteLayoutWrapper>
      </body>
    </html>
  );
}
