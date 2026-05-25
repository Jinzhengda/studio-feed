import { createClient } from "@/lib/supabase/server";
import MasonryGrid from "@/components/MasonryGrid";
import Link from "next/link";

export const revalidate = 0;

type WorkCard = {
  id: string;
  title: string;
  studio: string;
  thumbnail_url: string;
  studio_cover_url?: string | null;
  work_url: string;
  published_at: string;
  created_at: string;
  first_seen_at: string;
};

type WorkRow = {
  id: string;
  title: string | null;
  thumbnail_url: string | null;
  work_url: string | null;
  published_at: string | null;
  created_at: string | null;
  first_seen_at: string | null;
  studios: { name: string | null; cover_url: string | null } | { name: string | null; cover_url: string | null }[] | null;
};

const demoSizes = [
  [800, 520],
  [800, 1000],
  [800, 640],
  [800, 900],
  [800, 480],
  [800, 1100],
  [800, 700],
  [800, 560],
  [800, 840],
  [800, 620],
];

const demoWorks: WorkCard[] = Array.from({ length: 10 }).map((_, i) => {
  const [w, h] = demoSizes[i % demoSizes.length];
  return {
    id: `demo-${i}`,
    title: `Demo Work ${i + 1}`,
    studio: `Studio ${i + 1}`,
    thumbnail_url: `https://picsum.photos/seed/demo-${i}/${w}/${h}`,
    work_url: "#",
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    first_seen_at: new Date().toISOString(),
  };
});

export default async function HomePage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return (
      <section className="h-[calc(100vh-4.5rem)] overflow-hidden px-10 py-16">
        <div className="mx-auto flex h-full max-w-4xl flex-col items-center justify-start pt-28 text-center">
          <p className="mb-[60px] text-sm font-medium uppercase tracking-[0.5em] text-[var(--muted)]">
            StudioFeed
          </p>
          <h1 className="max-w-3xl text-5xl font-medium leading-[1.02] sm:text-[64px]">
            你的设计灵感工作台
          </h1>
          <p className="mt-6 max-w-[480px] text-base leading-7 text-[var(--muted)] sm:text-lg">
            聚合全球设计工作室的新作品、封面与更新时间。少一点噪音，多一点可以马上收藏、研究和回看的视觉线索。
          </p>
          <div className="mt-[60px] flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="home-hero-primary inline-flex h-10 w-36 items-center justify-center rounded-none text-sm transition-opacity hover:opacity-80"
            >
              登录
            </Link>
            <Link
              href="/about"
              className="inline-flex h-10 w-36 items-center justify-center rounded-none border border-[var(--stroke)] bg-transparent text-sm text-[var(--ink)] transition-colors hover:bg-[var(--hover)]"
            >
              About
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // 计算半年前的日期
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data } = await supabase
    .from("works")
    .select(
      "id,title,thumbnail_url,work_url,published_at,created_at,first_seen_at, studios(name, cover_url)"
    )
    .eq("is_visible", true)
    .gte("first_seen_at", sixMonthsAgo.toISOString())
    .order("first_seen_at", { ascending: false });

  const works: WorkCard[] =
    (data as WorkRow[] | null)?.map((w) => {
      const studio = Array.isArray(w.studios) ? w.studios[0] : w.studios;
      return {
        id: w.id,
        title: w.title || "Untitled",
        studio: studio?.name || "Unknown Studio",
        thumbnail_url: w.thumbnail_url || "",
        studio_cover_url: studio?.cover_url || "",
        work_url: w.work_url || "#",
        published_at: w.published_at || new Date().toISOString(),
        created_at: w.created_at || new Date().toISOString(),
        first_seen_at: w.first_seen_at || new Date().toISOString(),
      };
    }).filter((work) => work.studio !== "立入禁止") || demoWorks;

  // 去重：根据 work_url 去重
  const uniqueWorks = works.filter((work, index, self) =>
    index === self.findIndex((w) => w.work_url === work.work_url)
  );

  return (
    <section className="mx-auto max-w-6xl px-3 py-2 sm:px-6 sm:py-12">
      <MasonryGrid works={uniqueWorks} />
    </section>
  );
}
