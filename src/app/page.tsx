import { createClient } from "@/lib/supabase/server";
import MasonryGrid from "@/components/MasonryGrid";

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
    }) || demoWorks;

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
