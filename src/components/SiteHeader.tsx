"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import HeaderUserMenu from "@/components/HeaderUserMenu";
import MobileFeedSearch from "@/components/MobileFeedSearch";

export default function SiteHeader() {
  const pathname = usePathname();

  if (pathname === "/login") {
    return null;
  }

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--stroke)] bg-[var(--header-bg)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between px-6 py-3">
        <Link href="/" className="brand-wordmark">
          StudioFeed
        </Link>
        <div className="flex items-center gap-4">
          <Suspense fallback={null}>
            <MobileFeedSearch />
          </Suspense>
          <Suspense fallback={<span className="h-10 w-10" aria-hidden="true" />}>
            <HeaderUserMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
