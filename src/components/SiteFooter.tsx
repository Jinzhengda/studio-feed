"use client";

import { usePathname } from "next/navigation";

export default function SiteFooter() {
  const pathname = usePathname();

  if (pathname === "/" || pathname === "/login") {
    return null;
  }

  return (
    <footer className="border-t border-[var(--stroke)] bg-[var(--footer-bg)]">
      <div className="mx-auto max-w-6xl px-6 py-6 text-sm text-[var(--muted)] sm:px-7 sm:py-7 lg:px-8 lg:py-8">
        StudioFeed © 2026
      </div>
    </footer>
  );
}
