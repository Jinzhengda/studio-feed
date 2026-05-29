import { createClient } from "@/lib/supabase/server";
import MasonryGrid from "@/components/MasonryGrid";
import Link from "next/link";
import FloatingHeroGallery from "@/components/FloatingHeroGallery";

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
    const { data: heroData } = await supabase
      .from("works")
      .select("id,title,thumbnail_url")
      .eq("is_visible", true)
      .not("thumbnail_url", "is", null)
      .order("first_seen_at", { ascending: false })
      .limit(22);
    const heroWorks =
      (heroData as Pick<WorkRow, "id" | "title" | "thumbnail_url">[] | null)
        ?.map((work) => ({
          id: work.id,
          title: work.title || "Untitled",
          thumbnail_url: work.thumbnail_url || "",
        }))
        .filter((work) => work.thumbnail_url) || demoWorks;

    return (
      <section className="home-hero-section relative h-[calc(100vh-49px)] overflow-hidden px-10 py-8">
        <FloatingHeroGallery items={heroWorks} />
        <div className="absolute left-1/2 top-[40%] z-10 flex w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col items-center px-10 text-center">
          <h1 className="max-w-3xl text-5xl font-medium leading-[1.02] sm:text-[56px]">
            你的设计灵感<wbr />
            工作台
          </h1>
          <p className="mt-4 max-w-[480px] text-base leading-[1.35] text-[var(--muted)]">
            聚合全球设计工作室的新作品、封面与更新时间。少一点噪音，多一点可以马上收藏、研究和回看的视觉线索。
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-5">
            <Link
              href="/login"
              className="home-hero-primary inline-flex h-12 w-40 items-center justify-center rounded-none text-base transition-opacity hover:opacity-80"
            >
              登录
            </Link>
            <Link
              href="/about"
              className="inline-flex h-12 w-40 items-center justify-center rounded-none border border-[var(--stroke)] bg-[var(--card)] text-base text-[var(--ink)] transition-colors hover:bg-[var(--hover)]"
            >
              关于
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
