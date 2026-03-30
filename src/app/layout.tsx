import "./globals.css";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MobileMenu from "@/components/MobileMenu";

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

  let avatarUrl = null;
  if (data.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", data.user.id)
      .single();
    avatarUrl = profile?.avatar_url;
  }

  return (
    <html lang="zh">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="sticky top-0 z-20 border-b border-[var(--stroke)] bg-white/70 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
              <Link href="/" className="text-lg font-semibold">
                studio-feed
              </Link>
              <div className="flex items-center gap-6">
                <nav className="hidden md:flex items-center gap-6 text-sm">
                  <Link href="/about">About</Link>
                  <Link href="/contact">Contact</Link>
                </nav>
                <div className="md:hidden">
                  <MobileMenu isAuthed={!!data.user} avatarUrl={avatarUrl} showNavLinks={true} />
                </div>
                <div className="hidden md:block">
                  <MobileMenu isAuthed={!!data.user} avatarUrl={avatarUrl} showNavLinks={false} />
                </div>
              </div>
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
