"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
  const supabase = useMemo(() => createClient(), []);
  const [works, setWorks] = useState<Work[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [visibility, setVisibility] = useState<VisibilityFilter>("all");

  const loadWorks = useCallback(async () => {
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
  }, [supabase]);

  useEffect(() => {
    void Promise.resolve().then(loadWorks);
  }, [loadWorks]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredWorks = works.filter((work) => {
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
  const visibleCount = works.filter((work) => work.is_visible).length;
  const hiddenCount = works.length - visibleCount;

  async function toggleVisible(work: Work) {
    const { error } = await supabase
      .from("works")
      .update({ is_visible: !work.is_visible })
      .eq("id", work.id);

    if (error) {
      setMessage(error.message);
      return;
    }
    loadWorks();
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除这个作品吗？")) return;
    const { error } = await supabase.from("works").delete().eq("id", id);
    if (error) {
      setMessage(error.message);
      return;
    }
    loadWorks();
  }

  function getStudioName(work: Work) {
    const studio = Array.isArray(work.studios) ? work.studios[0] : work.studios;
    return studio?.name || "-";
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">作品管理</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            共 {works.length} 条，{visibleCount} 条可见，{hiddenCount} 条隐藏
          </p>
        </div>
        <button type="button" className="btn" onClick={loadWorks} disabled={loading}>
          {loading ? "刷新中..." : "刷新列表"}
        </button>
      </div>

      {message && <p className="mt-4 text-sm text-[var(--muted)]">{message}</p>}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          className="w-full rounded-none border border-[var(--stroke)] px-3 py-2.5 text-sm sm:max-w-sm"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索标题、工作室或链接"
        />
        <div className="inline-flex w-fit gap-2 text-sm">
          {(["all", "visible", "hidden"] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={`toggle-pill ${
                visibility === item ? "toggle-pill-active" : "toggle-pill-idle"
              }`}
              onClick={() => setVisibility(item)}
            >
              {item === "all" ? "全部" : item === "visible" ? "可见" : "隐藏"}
            </button>
          ))}
        </div>
      </div>

      <table className="mt-6 w-full border-collapse text-sm">
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
                  >
                    切换可见性
                  </button>
                  <button
                    className="btn-text"
                    onClick={() => handleDelete(work.id)}
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
                {works.length === 0 ? "暂无作品" : "没有符合筛选的作品"}
              </td>
            </tr>
          )}
          {loading && (
            <tr>
              <td className="py-5 text-sm text-[var(--muted)]" colSpan={5}>
                加载中...
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
