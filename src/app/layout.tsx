import "./globals.css";
import Link from "next/link";
import { Work_Sans, Playfair_Display } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import AuthButtons from "@/components/AuthButtons";

const workSans = Work_Sans({ subsets: ["latin"], variable: "--font-sans" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-serif" });

export const metadata = {
  title: "studio-feed",
  description: "设计工作室作品聚合展示工具",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return (
    <html lang="zh">
      <body className={`${workSans.variable} ${playfair.variable}`}>
        <div className="min-h-screen flex flex-col">
          <header className="sticky top-0 z-20 border-b border-[var(--stroke)] bg-white/70 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
              <Link href="/" className="text-lg font-semibold">
                studio-feed
              </Link>
              <nav className="flex items-center gap-6 text-sm">
                <Link href="/">Home</Link>
                <Link href="/about">About</Link>
                <Link href="/contact">Contact</Link>
              </nav>
              <AuthButtons isAuthed={!!data.user} />
            </div>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="border-t border-[var(--stroke)] bg-white/60">
            <div className="mx-auto max-w-6xl px-6 py-6 text-sm text-[var(--muted)]">
              studio-feed © 2026
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
