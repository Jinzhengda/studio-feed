import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const adminLinks = [
  { href: "/admin/studios", label: "工作室" },
  { href: "/admin/works", label: "作品" },
  { href: "/admin/profile", label: "个人设置" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-8 flex flex-col gap-5 border-b border-[var(--stroke)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-[var(--muted)]">
            StudioFeed Admin
          </p>
          <h1 className="mt-2 text-3xl">内容管理</h1>
        </div>
        <nav className="flex flex-wrap gap-2">
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex min-w-24 items-center justify-center rounded-full border border-[var(--stroke)] px-4 py-2 text-sm transition-colors hover:bg-[var(--hover)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </section>
  );
}
