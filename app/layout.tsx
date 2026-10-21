import type { Metadata } from "next";
import LaocoonChrome from "@/components/LaocoonChrome";
import SiteLayoutWrapper from "@/components/SiteLayoutWrapper";
import "./globals.css";

export const metadata: Metadata = {
  title: "HAHA — Humans Are Hard to Automate",
  description:
    "Tell a joke that fools the AI and get paid. An open comedy club & AI lab where people stump the Straight Man AI, verified by a human crowd.",
  icons: {
    icon: [
      { url: "/images/logo-transparent.png", sizes: "64x64", type: "image/png" },
      { url: "/images/logo.png", sizes: "1254x1254", type: "image/png" },
    ],
    apple: "/images/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400;1,600;1,700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Syne:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased font-sans bg-[#070709] text-[#f4f4f5] selection:bg-[#ffc53d]/30 selection:text-[#ffc53d]">
        <LaocoonChrome />
        <SiteLayoutWrapper>{children}</SiteLayoutWrapper>
      </body>
    </html>
  );
}
