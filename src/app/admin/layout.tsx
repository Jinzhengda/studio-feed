import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
    <section className="mx-auto max-w-6xl px-6 py-6 sm:px-7 sm:py-7 lg:px-8 lg:py-8">
      {children}
    </section>
  );
}
