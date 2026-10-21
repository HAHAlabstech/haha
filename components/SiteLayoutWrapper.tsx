"use client";

import { usePathname } from "next/navigation";
import SiteNav from "./SiteNav";
import SiteFooter from "./SiteFooter";
import ArrivalPreloader from "./ArrivalPreloader";

export default function SiteLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isApp = pathname?.startsWith("/app");
  const isHome = pathname === "/";

  if (isApp) {
    return <main className="relative min-h-screen">{children}</main>;
  }

  return (
    <>
      {isHome && <ArrivalPreloader />}
      <SiteNav />
      <main className="relative min-h-screen">{children}</main>
      <SiteFooter />
    </>
  );
}
