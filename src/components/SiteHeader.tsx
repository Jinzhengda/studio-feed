"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import HeaderUserMenu from "@/components/HeaderUserMenu";
import { HeaderMenuIcon } from "@/components/MobileMenu";
import MobileFeedSearch from "@/components/MobileFeedSearch";

export default function SiteHeader() {
  const pathname = usePathname();

  if (pathname === "/login") {
    return null;
  }

  return (
    <header className="site-header sticky top-0 z-20">
      <div className="site-header-inner mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/" className="site-header-brand">
          StudioFeed
        </Link>
        <div className="flex items-center gap-6">
          <Suspense fallback={null}>
            <MobileFeedSearch />
          </Suspense>
          <Suspense fallback={<HeaderMenuFallback />}>
            <HeaderUserMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

function HeaderMenuFallback() {
  return (
    <span className="site-header-menu-fallback" aria-hidden="true">
      <HeaderMenuIcon />
    </span>
  );
}
