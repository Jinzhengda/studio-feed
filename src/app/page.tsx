import { createClient } from "@/lib/supabase/server";

type WorkCard = {
  id: string;
  title: string;
  studio: string;
  thumbnail_url: string;
  work_url: string;
  published_at: string;
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
  };
});

export default async function HomePage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("works")
    .select("id,title,thumbnail_url,work_url,published_at, studios(name)")
    .eq("is_visible", true)
    .order("published_at", { ascending: false })
    .limit(60);

  const works: WorkCard[] =
    data?.map((w: any) => ({
      id: w.id,
      title: w.title,
      studio: w.studios?.name || "Unknown Studio",
      thumbnail_url:
        w.thumbnail_url || "https://picsum.photos/seed/fallback/800/600",
      work_url: w.work_url || "#",
      published_at: w.published_at || new Date().toISOString(),
    })) || demoWorks;

  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-semibold">最新作品</h1>
      <p className="mt-2 text-[var(--muted)]">
        收集设计工作室最新作品的展示墙
      </p>

      <div className="mt-8 columns-1 gap-6 sm:columns-2 lg:columns-3 xl:columns-4">
        {works.map((work) => (
          <article
            key={work.id}
            className="group mb-6 inline-block w-full break-inside-avoid overflow-hidden border border-[var(--stroke)] bg-[var(--card)] transition-all duration-200 hover:-translate-y-1 hover:shadow-sm"
          >
            <img
              src={work.thumbnail_url}
              alt={work.title}
              className="block w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
            <div className="p-4">
              <div className="text-xs text-[var(--muted)]">
                {new Date(work.published_at).toLocaleDateString()}
              </div>
              <h3 className="mt-2 text-lg font-medium">{work.title}</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">{work.studio}</p>
              <a href={work.work_url} className="mt-3 inline-block text-sm underline">
                查看作品
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
