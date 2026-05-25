"use client";

import { usePathname } from "next/navigation";

export default function SiteFooter() {
  const pathname = usePathname();

  if (pathname === "/" || pathname === "/login") {
    return null;
  }

  return (
    <footer className="border-t border-[var(--stroke)] bg-[var(--footer-bg)]">
      <div className="mx-auto max-w-6xl px-6 py-6 text-sm text-[var(--muted)]">
        StudioFeed © 2026
      </div>
    </footer>
  );
}
