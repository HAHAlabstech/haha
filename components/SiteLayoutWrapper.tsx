"use client";

import { usePathname } from "next/navigation";
import SiteNav from "./SiteNav";
import SiteFooter from "./SiteFooter";

export default function SiteLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isApp = pathname?.startsWith("/app");

  if (isApp) {
    return <main className="relative z-10 min-h-screen">{children}</main>;
  }

  return (
    <>
      <SiteNav />
      <main className="relative z-10 min-h-screen">{children}</main>
      <SiteFooter />
    </>
  );
}
