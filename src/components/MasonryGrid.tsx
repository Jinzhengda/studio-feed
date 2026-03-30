"use client";

import { useEffect, useRef, useState } from "react";
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

  // 将作品分配到各列
  const columnWorks: Work[][] = Array.from({ length: columns }, () => []);
  works.forEach((work, index) => {
    columnWorks[index % columns].push(work);
  });

  return (
    <div
      ref={containerRef}
      className="grid gap-2 sm:gap-6"
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {columnWorks.map((columnItems, columnIndex) => (
        <div key={columnIndex} className="flex flex-col gap-2 sm:gap-6">
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
  );
}
