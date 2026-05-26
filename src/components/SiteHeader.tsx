"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import HeaderUserMenu from "@/components/HeaderUserMenu";
import ThemeToggle from "@/components/ThemeToggle";
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
        <div className="flex items-center gap-6">
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
          </nav>
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
          <Suspense fallback={<span className="h-10 w-10" aria-hidden="true" />}>
            <HeaderUserMenu />
          </Suspense>
        </div>
        <Suspense fallback={null}>
          <MobileFeedSearch />
        </Suspense>
      </div>
    </header>
  );
}
