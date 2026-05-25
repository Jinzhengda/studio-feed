"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

export default function MasonryGrid({ works }: { works: Work[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(2);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<"time" | "random">("time");
  const [randomSeed, setRandomSeed] = useState(0);

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

  function chooseSortMode(nextMode: "time" | "random") {
    setSortMode(nextMode);
    if (nextMode === "random") setRandomSeed(createRandomSeed());
  }

  // 将作品分配到各列
  const columnWorks: Work[][] = Array.from({ length: columns }, () => []);
  displayedWorks.forEach((work, index) => {
    columnWorks[index % columns].push(work);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-start sm:gap-4">
        <input
          className="h-10 w-full rounded-none border border-[var(--stroke)] bg-[var(--card)] px-4 text-sm outline-none transition-colors focus:border-black focus:ring-0 dark:focus:border-white sm:w-[240px]"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索作品或工作室"
        />
        <div className="inline-flex w-fit items-center gap-2 text-sm">
          <button
            type="button"
            className={`home-sort-pill ${
              sortMode === "time" ? "home-sort-pill-active" : "home-sort-pill-idle"
            }`}
            onClick={() => chooseSortMode("time")}
          >
            按时间
          </button>
          <button
            type="button"
            className={`home-sort-pill ${
              sortMode === "random" ? "home-sort-pill-active" : "home-sort-pill-idle"
            }`}
            onClick={() => chooseSortMode("random")}
          >
            随机
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {columnWorks.map((columnItems, columnIndex) => (
          <div key={columnIndex} className="flex flex-col gap-4">
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

function createRandomSeed() {
  if (typeof window !== "undefined" && window.crypto) {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return values[0];
  }

  return Math.floor(Math.random() * 2 ** 32);
}
