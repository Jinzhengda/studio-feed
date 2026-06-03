"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import WorkImage from "./WorkImage";

type Work = {
  id: string;
  title: string;
  studio: string;
  thumbnail_url: string;
  studio_cover_url?: string | null;
  work_url: string;
  first_seen_at: string;
};

export default function MasonryGrid({
  works: initialWorks,
  pageSize = 20,
}: {
  works: Work[];
  pageSize?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadTriggerScrollYRef = useRef(-1000);
  const searchParams = useSearchParams();
  const [works, setWorks] = useState(initialWorks);
  const [columns, setColumns] = useState(2);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialWorks.length >= pageSize);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const query = searchParams.get("q") || "";
  const sortMode = searchParams.get("sort") === "random" ? "random" : "time";
  const randomSeed = Number(searchParams.get("seed") || 0);

  const loadMoreWorks = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const response = await fetch(`/api/works?page=${page}&limit=${pageSize}`);
      if (!response.ok) {
        setHasMore(false);
        return;
      }

      const payload = (await response.json()) as {
        works?: Work[];
        hasMore?: boolean;
        nextPage?: number;
      };
      const incomingWorks = payload.works || [];

      setWorks((currentWorks) => dedupeWorks([...currentWorks, ...incomingWorks]));
      setPage(payload.nextPage ?? page + 1);
      setHasMore(Boolean(payload.hasMore));
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, page, pageSize]);

  useEffect(() => {
    function updateColumns() {
      const width = window.innerWidth;
      if (width >= 1280) setColumns(4); // xl
      else if (width >= 1024) setColumns(3); // lg
      else if (width >= 640) setColumns(2); // sm
      else setColumns(2);
    }

    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          const scrollY = window.scrollY;
          if (Math.abs(scrollY - loadTriggerScrollYRef.current) < 160) return;
          loadTriggerScrollYRef.current = scrollY;
          void loadMoreWorks();
        }
      },
      { rootMargin: "420px 0px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMoreWorks, page]);

  const displayedWorks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = works.filter((work) => {
      if (!normalizedQuery) return true;
      return (
        work.title.toLowerCase().includes(normalizedQuery) ||
        work.studio.toLowerCase().includes(normalizedQuery)
      );
    });

    if (sortMode === "random") {
      return [...filtered].sort((a, b) => {
        const aScore = seededScore(a.id, randomSeed);
        const bScore = seededScore(b.id, randomSeed);
        return aScore - bScore;
      });
    }

    return [...filtered].sort(
      (a, b) =>
        new Date(b.first_seen_at).getTime() - new Date(a.first_seen_at).getTime()
    );
  }, [query, randomSeed, sortMode, works]);

  // 将作品分配到各列
  const columnWorks: Work[][] = Array.from({ length: columns }, () => []);
  displayedWorks.forEach((work, index) => {
    columnWorks[index % columns].push(work);
  });

  return (
    <div>
      <div
        ref={containerRef}
        className="grid gap-6 sm:gap-7 lg:gap-8"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {columnWorks.map((columnItems, columnIndex) => (
          <div key={columnIndex} className="flex flex-col gap-6 sm:gap-7 lg:gap-8">
            {columnItems.map((work) => (
              <a
                key={work.id}
                href={work.work_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col overflow-hidden border border-[var(--stroke)] bg-[var(--card)] transition-all duration-200 hover:shadow-lg hover:-translate-y-1 Claude Code-pointer"
              >
                <div className="overflow-hidden">
                  <WorkImage
                    src={work.thumbnail_url}
                    fallback={work.studio_cover_url}
                    alt={work.title}
                    className="block w-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-103"
                  />
                </div>
                <div className="p-3 sm:p-4">
                  <div className="text-xs text-[var(--muted)]">
                    {new Date(work.first_seen_at).toLocaleDateString("zh-CN")}
                  </div>
                  <h3 className="mt-2 text-sm font-medium sm:text-lg">{work.title}</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">{work.studio}</p>
                </div>
              </a>
            ))}
          </div>
        ))}
      </div>

      {displayedWorks.length === 0 && (
        <p className="py-10 text-sm text-[var(--muted)]">没有符合搜索的作品</p>
      )}

      <div ref={sentinelRef} aria-hidden="true" />

      {isLoadingMore && <MasonrySkeleton columns={columns} />}
    </div>
  );

}

function seededScore(input: string, seed: number) {
  let hash = seed + 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function dedupeWorks(works: Work[]) {
  const seen = new Set<string>();

  return works.filter((work) => {
    const key = work.work_url || work.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function MasonrySkeleton({ columns }: { columns: number }) {
  const columnItems = Array.from({ length: columns }, (_, columnIndex) =>
    Array.from({ length: 2 }, (_, itemIndex) => columnIndex * 2 + itemIndex)
  );

  return (
    <div
      className="mt-6 grid gap-6 sm:gap-7 lg:gap-8"
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {columnItems.map((items, columnIndex) => (
        <div key={columnIndex} className="flex flex-col gap-6 sm:gap-7 lg:gap-8">
          {items.map((item) => (
            <div
              key={item}
              className="overflow-hidden border border-[var(--stroke)] bg-[var(--card)]"
            >
              <div
                className="admin-skeleton-block"
                style={{ height: item % 3 === 0 ? 260 : item % 3 === 1 ? 340 : 300 }}
              />
              <div className="space-y-3 p-3 sm:p-4">
                <div className="admin-skeleton-line w-24" />
                <div className="admin-skeleton-line h-5 w-3/4" />
                <div className="admin-skeleton-line w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
