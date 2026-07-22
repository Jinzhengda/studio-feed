"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useSearchParams } from "next/navigation";
import WorkImage from "./WorkImage";
import {
  getCardMode,
  getServerCardMode,
  subscribeCardMode,
} from "@/lib/card-mode";
import {
  getSearchQuery,
  getServerSearchQuery,
  subscribeSearchQuery,
} from "@/lib/search-query";

type Work = {
  id: string;
  title: string;
  studio: string;
  thumbnail_url: string;
  studio_cover_url?: string | null;
  work_url: string;
  published_at?: string | null;
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
  const query = useSyncExternalStore(
    subscribeSearchQuery,
    getSearchQuery,
    getServerSearchQuery,
  );
  const sortMode = searchParams.get("sort") === "random" ? "random" : "time";
  const randomSeed = Number(searchParams.get("seed") || 0);
  const cardMode = useSyncExternalStore(
    subscribeCardMode,
    getCardMode,
    getServerCardMode,
  );

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

    function maybeLoadMore() {
      const distanceToBottom =
        document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
      if (distanceToBottom > 1200) return;

      const scrollY = window.scrollY;
      if (Math.abs(scrollY - loadTriggerScrollYRef.current) < 160) return;
      loadTriggerScrollYRef.current = scrollY;
      void loadMoreWorks();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          maybeLoadMore();
        }
      },
      { rootMargin: "420px 0px" }
    );

    observer.observe(sentinel);
    window.addEventListener("scroll", maybeLoadMore, { passive: true });
    maybeLoadMore();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", maybeLoadMore);
    };
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

    return [...filtered].sort((a, b) => getSortTime(b) - getSortTime(a));
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
        className="grid gap-x-6 gap-y-6"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {columnWorks.map((columnItems, columnIndex) => (
          <div key={columnIndex} className="flex flex-col gap-x-0 gap-y-8">
            {columnItems.map((work) => (
              <a
                key={work.id}
                href={work.work_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`work-card group work-card-mode-${cardMode}`}
              >
                <div className="work-card-media">
                  <WorkImage
                    src={work.thumbnail_url}
                    fallback={work.studio_cover_url}
                    alt={work.title}
                    className="work-card-image"
                  />
                  <div className="work-card-overlay" aria-hidden={cardMode !== "text"}>
                    <h3 className="work-card-overlay-title">{work.title}</h3>
                    <div className="work-card-overlay-meta">
                      <span>{formatWorkDate(work)}</span>
                      <span>{work.studio}</span>
                    </div>
                  </div>
                </div>
                <div className="work-card-details">
                  <div className="work-card-date">{formatWorkDate(work)}</div>
                  <h3 className="work-card-title">{work.title}</h3>
                  <p className="work-card-studio">{work.studio}</p>
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

      {isLoadingMore && <MasonrySkeleton columns={columns} cardMode={cardMode} />}
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

function getSortTime(work: Work) {
  return new Date(work.published_at || work.first_seen_at).getTime();
}

function formatWorkDate(work: Work) {
  return new Date(work.published_at || work.first_seen_at).toLocaleDateString("zh-CN");
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

function MasonrySkeleton({
  columns,
  cardMode,
}: {
  columns: number;
  cardMode: "image" | "text";
}) {
  const columnItems = Array.from({ length: columns }, (_, columnIndex) =>
    Array.from({ length: 2 }, (_, itemIndex) => columnIndex * 2 + itemIndex)
  );
  const mediaHeights = [188, 318, 164, 252, 212, 334, 174, 286];

  return (
    <div
      className="mt-6 grid gap-x-6 gap-y-6"
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {columnItems.map((items, columnIndex) => (
        <div key={columnIndex} className="flex flex-col gap-x-0 gap-y-8">
          {items.map((item) => (
            <div
              key={item}
              className={`work-card work-card-mode-${cardMode} work-card-skeleton`}
            >
              <div
                className="work-card-skeleton-media admin-skeleton-block"
                style={{ height: mediaHeights[item % mediaHeights.length] }}
              />
              {cardMode === "image" && (
                <div className="work-card-skeleton-details">
                  <div className="admin-skeleton-line w-20" />
                  <div className="admin-skeleton-line h-5 w-4/5" />
                  <div className="admin-skeleton-line w-2/5" />
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
