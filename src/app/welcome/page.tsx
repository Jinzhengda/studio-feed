import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ButtonLink } from "@/components/Button";

export default async function WelcomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { count } = await supabase
    .from("studios")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);
  if ((count || 0) > 0) redirect("/");

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <p className="text-sm text-[var(--muted)]">账号创建成功</p>
      <h1 className="mt-3 text-4xl font-semibold">添加你的第一家工作室</h1>
      <p className="mt-4 leading-7 text-[var(--muted)]">
        填写工作室名称和作品页地址，StudioFeed 会抓取并整理最新作品。
      </p>
      <ButtonLink href="/admin/studios?new=1" className="mt-8">
        添加工作室
      </ButtonLink>
    </section>
  );
}
