import { createClient } from "@/lib/supabase/server";
import MasonryGrid from "@/components/MasonryGrid";
import { ButtonLink } from "@/components/Button";
import Link from "next/link";
import FloatingHeroGallery from "@/components/FloatingHeroGallery";
import {
  extractDateFromMediaVersion,
  shouldDisplayWork,
  shouldPreferCaptureDate,
} from "@/lib/work-rules";

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
  studios:
    | { name: string | null; cover_url: string | null; owner_id?: string | null }
    | { name: string | null; cover_url: string | null; owner_id?: string | null }[]
    | null;
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

const HOME_PAGE_SIZE = 20;
const HOME_CANDIDATE_SIZE = 320;
const SUPPLEMENTAL_WORK_URL_PATTERN = "%weareink.co.uk%";

function getStudio(
  studios: WorkRow["studios"]
) {
  return Array.isArray(studios) ? studios[0] : studios;
}

function toWorkCard(row: WorkRow): WorkCard {
  const studio = getStudio(row.studios);
  const effectiveDate =
    shouldPreferCaptureDate(row.work_url)
      ? row.created_at ||
        row.first_seen_at ||
        row.published_at ||
        new Date().toISOString()
      : row.published_at ||
        row.first_seen_at ||
        extractDateFromMediaVersion(row.thumbnail_url) ||
        row.created_at ||
        new Date().toISOString();

  return {
    id: row.id,
    title: row.title || "Untitled",
    studio: studio?.name || "Unknown Studio",
    thumbnail_url: row.thumbnail_url || "",
    studio_cover_url: studio?.cover_url || "",
    work_url: row.work_url || "#",
    published_at: effectiveDate,
    created_at: row.created_at || new Date().toISOString(),
    first_seen_at: row.first_seen_at || effectiveDate,
  };
}

function prepareWorks(rows: WorkRow[] | null | undefined, limit: number) {
  const seen = new Set<string>();

  return (rows || [])
    .filter((row) => shouldDisplayWork(row))
    .map(toWorkCard)
    .filter((work) => work.studio !== "立入禁止")
    .filter((work) => {
      const key = work.work_url || work.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    )
    .slice(0, limit);
}

export default async function HomePage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return (
      <section className="home-hero-section relative h-[calc(100vh-49px)] overflow-hidden px-10 py-8">
        <FloatingHeroGallery items={demoWorks} />
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

  const selectColumns =
    "id,title,thumbnail_url,work_url,published_at,created_at,first_seen_at, studios!inner(name, cover_url, owner_id)";
  const [{ data: publishedData }, { data: recentData }, { data: supplementalData }] = await Promise.all([
    supabase
      .from("works")
      .select(selectColumns)
      .eq("is_visible", true)
      .eq("studios.owner_id", userData.user.id)
      .not("thumbnail_url", "is", null)
      .gte("first_seen_at", sixMonthsAgo.toISOString())
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("first_seen_at", { ascending: false })
      .range(0, HOME_CANDIDATE_SIZE - 1),
    supabase
      .from("works")
      .select(selectColumns)
      .eq("is_visible", true)
      .eq("studios.owner_id", userData.user.id)
      .not("thumbnail_url", "is", null)
      .gte("first_seen_at", sixMonthsAgo.toISOString())
      .order("first_seen_at", { ascending: false })
      .range(0, HOME_CANDIDATE_SIZE - 1),
    supabase
      .from("works")
      .select(selectColumns)
      .eq("is_visible", true)
      .eq("studios.owner_id", userData.user.id)
      .not("thumbnail_url", "is", null)
      .ilike("work_url", SUPPLEMENTAL_WORK_URL_PATTERN)
      .order("first_seen_at", { ascending: false })
      .limit(60),
  ]);

  const uniqueWorks = prepareWorks(
    [
      ...((publishedData as WorkRow[] | null) || []),
      ...((recentData as WorkRow[] | null) || []),
      ...((supplementalData as WorkRow[] | null) || []),
    ],
    HOME_PAGE_SIZE
  );

  if (uniqueWorks.length === 0) {
    return (
      <section className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center px-6 text-center">
        <h1 className="text-3xl font-semibold">你的作品流还是空的</h1>
        <p className="mt-4 leading-7 text-[var(--muted)]">
          添加第一家工作室并刷新后，相关作品会显示在这里。
        </p>
        <ButtonLink href="/admin/studios?new=1" className="mt-8">
          添加工作室
        </ButtonLink>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-6 sm:px-7 sm:py-7 lg:px-8 lg:py-8">
      <MasonryGrid works={uniqueWorks} pageSize={HOME_PAGE_SIZE} />
    </section>
  );
}
