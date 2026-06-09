"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { shouldDisplayWork } from "@/lib/work-rules";

type Work = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  work_url: string | null;
  published_at: string | null;
  is_visible: boolean;
  studios?: { name: string } | { name: string }[] | null;
};

type VisibilityFilter = "all" | "visible" | "hidden";

export default function WorksAdminPage() {
  const supabase = createClient();
  const [works, setWorks] = useState<Work[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [visibility, setVisibility] = useState<VisibilityFilter>("all");
  const [activeWorkId, setActiveWorkId] = useState<string | null>(null);

  async function loadWorks() {
    setLoading(true);
    const { data, error } = await supabase
      .from("works")
      .select("id,title,thumbnail_url,work_url,published_at,is_visible,studios(name)")
      .order("published_at", { ascending: false, nullsFirst: false });

    if (error) {
      setMessage(error.message);
    } else {
      setWorks((data ?? []) as Work[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    void Promise.resolve().then(loadWorks);
  // createClient() returns a stable browser client for this module usage.
  // We only want the initial fetch on mount here.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const displayWorks = works.filter((work) => shouldDisplayWork(work));
  const filteredWorks = displayWorks.filter((work) => {
    const studioName = getStudioName(work).toLowerCase();
    const matchesQuery =
      !normalizedQuery ||
      work.title.toLowerCase().includes(normalizedQuery) ||
      studioName.includes(normalizedQuery) ||
      (work.work_url || "").toLowerCase().includes(normalizedQuery);

    const matchesVisibility =
      visibility === "all" ||
      (visibility === "visible" && work.is_visible) ||
      (visibility === "hidden" && !work.is_visible);

    return matchesQuery && matchesVisibility;
  });
  const visibleCount = displayWorks.filter((work) => work.is_visible).length;
  const hiddenCount = displayWorks.length - visibleCount;
  const filteredVisibleCount = filteredWorks.filter((work) => work.is_visible).length;
  const filteredHiddenCount = filteredWorks.length - filteredVisibleCount;

  async function toggleVisible(work: Work) {
    setActiveWorkId(work.id);
    const { error } = await supabase
      .from("works")
      .update({ is_visible: !work.is_visible })
      .eq("id", work.id);

    if (error) {
      setMessage(error.message);
      setActiveWorkId(null);
      return;
    }
    await loadWorks();
    setActiveWorkId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除这个作品吗？")) return;
    setActiveWorkId(id);
    const { error } = await supabase.from("works").delete().eq("id", id);
    if (error) {
      setMessage(error.message);
      setActiveWorkId(null);
      return;
    }
    await loadWorks();
    setActiveWorkId(null);
  }

  function getStudioName(work: Work) {
    const studio = Array.isArray(work.studios) ? work.studios[0] : work.studios;
    return studio?.name || "-";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">作品管理</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            共 {displayWorks.length} 条，{visibleCount} 条可见，{hiddenCount} 条隐藏
          </p>
        </div>
        <button type="button" className="btn rounded-none" onClick={loadWorks} disabled={loading}>
          {loading ? "刷新中..." : "刷新列表"}
        </button>
      </div>

      {message && <p className="mt-4 text-sm text-[var(--muted)]">{message}</p>}

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <p className="admin-stat-label">当前结果</p>
          <p className="admin-stat-value">{filteredWorks.length}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">结果中可见</p>
          <p className="admin-stat-value">{filteredVisibleCount}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">结果中隐藏</p>
          <p className="admin-stat-value">{filteredHiddenCount}</p>
        </div>
      </div>

      <div className="admin-filter-bar mt-6">
        <input
          className="admin-search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索标题、工作室或链接"
        />
        <div className="admin-filter-group">
          {(["all", "visible", "hidden"] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={`admin-filter-pill ${
                visibility === item
                  ? "admin-filter-pill-active"
                  : "admin-filter-pill-idle"
              }`}
              onClick={() => setVisibility(item)}
            >
              {item === "all" ? "全部" : item === "visible" ? "可见" : "隐藏"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:hidden">
        {!loading &&
          filteredWorks.map((work) => (
            <article
              key={work.id}
              className="border border-[var(--stroke)] bg-[var(--card)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <a
                    href={work.work_url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="line-clamp-2 text-base underline-offset-4 hover:underline"
                  >
                    {work.title}
                  </a>
                  <p className="mt-2 text-sm text-[var(--muted)]">{getStudioName(work)}</p>
                </div>
                <span className="shrink-0 text-xs text-[var(--muted)]">
                  {work.is_visible ? "可见" : "隐藏"}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 text-sm text-[var(--muted)]">
                <span>
                  {work.published_at
                    ? new Date(work.published_at).toLocaleDateString()
                    : "未设置日期"}
                </span>
                <div className="flex gap-3">
                  <button
                    className="btn-text"
                    onClick={() => toggleVisible(work)}
                    disabled={activeWorkId === work.id}
                  >
                    {activeWorkId === work.id ? "处理中..." : "切换可见性"}
                  </button>
                  <button
                    className="btn-text"
                    onClick={() => handleDelete(work.id)}
                    disabled={activeWorkId === work.id}
                  >
                    删除
                  </button>
                </div>
              </div>
            </article>
          ))}
        {!loading && filteredWorks.length === 0 && (
          <p className="text-sm text-[var(--muted)]">
            {displayWorks.length === 0 ? "暂无作品" : "没有符合筛选的作品"}
          </p>
        )}
        {loading && <WorksCardSkeleton />}
      </div>

      <table className="mt-2 hidden w-full border-collapse text-sm md:table">
        <thead>
          <tr className="text-left">
            <th className="border-b border-[var(--stroke)] py-3">作品</th>
            <th className="border-b border-[var(--stroke)] py-3">工作室</th>
            <th className="border-b border-[var(--stroke)] py-3">发布时间</th>
            <th className="border-b border-[var(--stroke)] py-3">可见</th>
            <th className="border-b border-[var(--stroke)] py-3">操作</th>
          </tr>
        </thead>
        <tbody>
          {filteredWorks.map((work) => (
            <tr key={work.id}>
              <td className="border-b border-[var(--stroke)] py-3">
                <a
                  href={work.work_url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-offset-4 hover:underline"
                >
                  {work.title}
                </a>
              </td>
              <td className="border-b border-[var(--stroke)] py-3">
                {getStudioName(work)}
              </td>
              <td className="border-b border-[var(--stroke)] py-3">
                {work.published_at
                  ? new Date(work.published_at).toLocaleDateString()
                  : "-"}
              </td>
              <td className="border-b border-[var(--stroke)] py-3">
                {work.is_visible ? "是" : "否"}
              </td>
              <td className="border-b border-[var(--stroke)] py-3">
                <div className="flex gap-2">
                  <button
                    className="btn-text"
                    onClick={() => toggleVisible(work)}
                    disabled={activeWorkId === work.id}
                  >
                    {activeWorkId === work.id ? "处理中..." : "切换可见性"}
                  </button>
                  <button
                    className="btn-text"
                    onClick={() => handleDelete(work.id)}
                    disabled={activeWorkId === work.id}
                  >
                    删除
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {!loading && filteredWorks.length === 0 && (
            <tr>
              <td className="py-5 text-sm text-[var(--muted)]" colSpan={5}>
                {displayWorks.length === 0 ? "暂无作品" : "没有符合筛选的作品"}
              </td>
            </tr>
          )}
          {loading && (
            <WorksTableSkeleton />
          )}
        </tbody>
      </table>
    </div>
  );
}

function WorksCardSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, index) => (
        <article key={index} className="border border-[var(--stroke)] bg-[var(--card)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="w-full min-w-0 space-y-3">
              <div className="admin-skeleton-line h-5 w-3/4" />
              <div className="admin-skeleton-line w-1/2" />
            </div>
            <div className="admin-skeleton-line h-3 w-10 shrink-0" />
          </div>
          <div className="mt-5 flex items-center justify-between gap-3">
            <div className="admin-skeleton-line w-24" />
            <div className="admin-skeleton-line w-32" />
          </div>
        </article>
      ))}
    </>
  );
}

function WorksTableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, index) => (
        <tr key={index}>
          <td className="border-b border-[var(--stroke)] py-3">
            <div className="admin-skeleton-line w-3/4" />
          </td>
          <td className="border-b border-[var(--stroke)] py-3">
            <div className="admin-skeleton-line w-20" />
          </td>
          <td className="border-b border-[var(--stroke)] py-3">
            <div className="admin-skeleton-line w-24" />
          </td>
          <td className="border-b border-[var(--stroke)] py-3">
            <div className="admin-skeleton-line w-8" />
          </td>
          <td className="border-b border-[var(--stroke)] py-3">
            <div className="admin-skeleton-line w-32" />
          </td>
        </tr>
      ))}
    </>
  );
}
