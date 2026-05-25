import "./globals.css";
import Link from "next/link";
import HeaderUserMenu from "@/components/HeaderUserMenu";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata = {
  title: "StudioFeed",
  description: "设计工作室作品聚合展示工具",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem("studio-feed-theme");
                var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                if (theme === "dark" || (!theme && prefersDark)) {
                  document.documentElement.classList.add("dark");
                }
              } catch {}
            `,
          }}
        />
        <script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async></script>
      </head>
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="sticky top-0 z-20 border-b border-[var(--stroke)] bg-[var(--header-bg)] backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
              <Link href="/" className="brand-wordmark">
                StudioFeed
              </Link>
              <div className="flex items-center gap-6">
                <nav className="hidden md:flex items-center gap-6 text-sm">
                  <Link href="/about">About</Link>
                  <Link href="/contact">Contact</Link>
                </nav>
                <ThemeToggle />
                <HeaderUserMenu />
              </div>
            </div>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="border-t border-[var(--stroke)] bg-[var(--footer-bg)]">
            <div className="mx-auto max-w-6xl px-6 py-6 text-sm text-[var(--muted)]">
              StudioFeed © 2026
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
