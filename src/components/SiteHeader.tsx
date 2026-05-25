"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import HeaderUserMenu from "@/components/HeaderUserMenu";
import ThemeToggle from "@/components/ThemeToggle";

export default function SiteHeader() {
  const pathname = usePathname();

  if (pathname === "/login") {
    return null;
  }

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--stroke)] bg-[var(--header-bg)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="brand-wordmark">
          StudioFeed
        </Link>
        <div className="flex items-center gap-6">
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
          </nav>
          <ThemeToggle />
          <HeaderUserMenu />
        </div>
      </div>
    </header>
  );
}
