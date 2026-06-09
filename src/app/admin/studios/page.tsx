"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import CoverUploader from "@/components/CoverUploader";
import { isUsableWorkThumbnail, shouldDisplayWork } from "@/lib/work-rules";

type Studio = {
  id: string;
  name: string;
  website_url: string | null;
  feed_url: string | null;
  cover_url: string | null;
  location: string | null;
  tags: string | null;
  is_active: boolean;
};

const emptyForm = {
  id: "",
  name: "",
  website_url: "",
  feed_url: "",
  cover_url: "",
  location: "",
  tags: "",
  is_active: true,
};

export default function StudiosAdminPage() {
  const supabase = createClient();

  const [studios, setStudios] = useState<Studio[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [activeStudioId, setActiveStudioId] = useState<string | null>(null);
  const [latestWorkThumbByStudioId, setLatestWorkThumbByStudioId] = useState<
    Record<string, string>
  >({});

  function showToast(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(""), 2000);
  }

  async function saveCoverUrl(url: string) {
    const studioId = form.id;
    setForm((prev) => ({ ...prev, cover_url: url }));
    if (!studioId) return;

    const { error } = await supabase
      .from("studios")
      .update({ cover_url: url })
      .eq("id", studioId);
    if (error) {
      setMessage(error.message);
      return;
    }
    showToast("兜底封面已保存");
    loadStudios();
  }

  function isDisplayableThumb(url: string | null | undefined) {
    return isUsableWorkThumbnail(url);
  }

  function coverStatus(studio: Studio) {
    if (studio.cover_url) {
      return {
        label: "兜底已设置",
        preview: studio.cover_url,
        hint: "抓取失败时首页会用这张图",
      };
    }
    const workThumb = latestWorkThumbByStudioId[studio.id];
    if (isDisplayableThumb(workThumb)) {
      return {
        label: "仅作品图",
        preview: workThumb,
        hint: "首页主图来自抓取，建议上传兜底封面",
      };
    }
    return {
      label: "无图",
      preview: null,
      hint: "请抓取作品或上传兜底封面",
    };
  }

  async function loadStudios() {
    setLoading(true);
    try {
      const [{ data: studioRows }, { data: workRows }] = await Promise.all([
        supabase.from("studios").select("*").order("created_at", { ascending: false }),
        supabase
          .from("works")
          .select("studio_id,thumbnail_url,work_url,first_seen_at")
          .eq("is_visible", true)
          .not("thumbnail_url", "is", null)
          .order("first_seen_at", { ascending: false }),
      ]);

      setStudios((studioRows as Studio[]) || []);

      const latest: Record<string, string> = {};
      for (const work of workRows || []) {
        const studioId = work.studio_id as string;
        const thumb = work.thumbnail_url as string;
        if (!studioId || latest[studioId] || !shouldDisplayWork(work)) continue;
        latest[studioId] = thumb;
      }
      setLatestWorkThumbByStudioId(latest);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredStudios = studios.filter((studio) => {
    const matchesQuery =
      !normalizedQuery ||
      studio.name.toLowerCase().includes(normalizedQuery) ||
      (studio.website_url || "").toLowerCase().includes(normalizedQuery) ||
      (studio.feed_url || "").toLowerCase().includes(normalizedQuery) ||
      (studio.location || "").toLowerCase().includes(normalizedQuery) ||
      (studio.tags || "").toLowerCase().includes(normalizedQuery);

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && studio.is_active) ||
      (statusFilter === "inactive" && !studio.is_active);

    return matchesQuery && matchesStatus;
  });
  const activeCount = studios.filter((studio) => studio.is_active).length;
  const inactiveCount = studios.length - activeCount;
  const fallbackCoverCount = studios.filter((studio) => studio.cover_url).length;

  function openCreateForm() {
    setForm({ ...emptyForm });
    setMessage("");
    setIsFormOpen(true);
  }

  function openEditForm(studio: Studio) {
    setForm({
      id: studio.id,
      name: studio.name,
      website_url: studio.website_url || "",
      feed_url: studio.feed_url || "",
      cover_url: studio.cover_url || "",
      location: studio.location || "",
      tags: studio.tags || "",
      is_active: studio.is_active,
    });
    setMessage("");
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setForm({ ...emptyForm });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const payload = {
      name: form.name,
      website_url: form.website_url || null,
      feed_url: form.feed_url || null,
      cover_url: form.cover_url || null,
      location: form.location || null,
      tags: form.tags || null,
      is_active: form.is_active,
    };

    try {
      if (form.id) {
        const { error } = await supabase
          .from("studios")
          .update(payload)
          .eq("id", form.id);

        if (error) throw error;
        showToast("已更新");
      } else {
        const { error } = await supabase.from("studios").insert(payload);

        if (error) throw error;
        showToast("已新增");
      }

      setForm({ ...emptyForm });
      setIsFormOpen(false);
      loadStudios();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除这个工作室吗？")) return;
    setActiveStudioId(id);

    try {
      const { error } = await supabase.from("studios").delete().eq("id", id);
      if (error) throw error;
      showToast("已删除");
      await loadStudios();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除失败");
    } finally {
      setActiveStudioId(null);
    }
  }

  async function refreshDemo() {
    setMessage("");
    setRefreshing(true);
    try {
      const res = await fetch("/api/refresh-works", { method: "POST" });
      setRefreshing(false);
      if (!res.ok) {
        showToast("刷新失败（" + res.status + "）");
        return;
      }
      const result = await res.json();
      const inserted = result.inserted ?? 0;
      const updated = result.updated ?? 0;
      const debugRows = Array.isArray(result.debug) ? result.debug : [];
      if (inserted === 0 && updated === 0) {
        showToast("无新内容");
      } else {
        const parts = [];
        if (inserted > 0) parts.push(`新增 ${inserted} 条`);
        if (updated > 0) parts.push(`更新封面 ${updated} 条`);
        showToast(parts.join("，"));
      }
      if (debugRows.length > 0) {
        setMessage(
          debugRows
            .map(
              (d: {
                studio?: string;
                scraped?: number;
                existing?: number;
                matched?: number;
                updated?: number;
                inserted?: number;
              }) =>
                `${d.studio || "Unknown"}: scraped=${d.scraped ?? 0}, existing=${d.existing ?? 0}, matched=${d.matched ?? 0}, updated=${d.updated ?? 0}, inserted=${d.inserted ?? 0}`
            )
            .join("\n")
        );
      }
    } catch (e) {
      setRefreshing(false);
      showToast("请求失败：" + (e instanceof Error ? e.message : String(e)));
    }
  }

  return (
    <div className="space-y-12">
      {toast && (
        <div className="fixed left-1/2 top-6 z-[9999] -translate-x-1/2 rounded-full bg-black px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">工作室列表</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              共 {studios.length} 家，{activeCount} 家启用，{inactiveCount} 家停用，{fallbackCoverCount}{" "}
              家已上传兜底封面
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="btn rounded-none" onClick={openCreateForm}>
              新增工作室
            </button>
            <button
              type="button"
              className="btn rounded-none"
              onClick={refreshDemo}
              disabled={refreshing}
            >
              {refreshing ? "刷新中..." : "刷新数据"}
            </button>
          </div>
        </div>
        {message && !isFormOpen && (
          <p className="mb-6 whitespace-pre-wrap text-sm text-[var(--muted)]">
            {message}
          </p>
        )}

        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <p className="admin-stat-label">筛选结果</p>
            <p className="admin-stat-value">{filteredStudios.length}</p>
          </div>
          <div className="admin-stat-card">
            <p className="admin-stat-label">已启用</p>
            <p className="admin-stat-value">{activeCount}</p>
          </div>
          <div className="admin-stat-card">
            <p className="admin-stat-label">未启用</p>
            <p className="admin-stat-value">{inactiveCount}</p>
          </div>
        </div>

        <div className="admin-filter-bar mb-6">
          <input
            className="admin-search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索名称、官网、地区或标签"
          />
          <div className="admin-filter-group">
            {(["all", "active", "inactive"] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={`admin-filter-pill ${
                  statusFilter === item
                    ? "admin-filter-pill-active"
                    : "admin-filter-pill-idle"
                }`}
                onClick={() => setStatusFilter(item)}
              >
                {item === "all" ? "全部" : item === "active" ? "启用" : "停用"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <StudiosLoadingSkeleton />
        ) : (
          <>
            <div className="grid gap-4 md:hidden">
              {filteredStudios.map((studio) => (
                <article
                  key={studio.id}
                  className="border border-[var(--stroke)] bg-[var(--card)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-base">{studio.name}</h3>
                      <p className="mt-2 text-sm text-[var(--muted)]">
                        {studio.location || "未设置地区"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-[var(--muted)]">
                      {studio.is_active ? "启用" : "停用"}
                    </span>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-[var(--muted)]">
                    <p className="truncate">{studio.website_url || "未设置官网"}</p>
                    <p className="truncate">{studio.feed_url || "未设置抓取地址"}</p>
                    <p>{coverStatus(studio).label}</p>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <button className="btn-text" onClick={() => openEditForm(studio)}>
                      编辑
                    </button>
                    <button
                      className="btn-text"
                      onClick={() => handleDelete(studio.id)}
                      disabled={activeStudioId === studio.id}
                    >
                      {activeStudioId === studio.id ? "删除中..." : "删除"}
                    </button>
                  </div>
                </article>
              ))}
              {filteredStudios.length === 0 && (
                <p className="text-sm text-[var(--muted)]">
                  {studios.length === 0 ? "暂无工作室" : "没有符合筛选的工作室"}
                </p>
              )}
            </div>

            <table className="hidden w-full border-collapse text-sm md:table">
              <thead>
                <tr className="text-left">
                  <th className="border-b border-[var(--stroke)] py-3">名称</th>
                  <th className="border-b border-[var(--stroke)] py-3">官网</th>
                  <th className="border-b border-[var(--stroke)] py-3">兜底封面</th>
                  <th className="border-b border-[var(--stroke)] py-3">启用</th>
                  <th className="border-b border-[var(--stroke)] py-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudios.map((studio) => (
                  <tr key={studio.id}>
                    <td className="border-b border-[var(--stroke)] py-3">
                      {studio.name}
                    </td>
                    <td className="border-b border-[var(--stroke)] py-3">
                      {studio.website_url || "-"}
                    </td>
                    <td className="border-b border-[var(--stroke)] py-3">
                      {(() => {
                        const status = coverStatus(studio);
                        return (
                          <div className="flex items-center gap-3">
                            {status.preview ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={status.preview}
                                alt=""
                                className="h-10 w-14 shrink-0 border border-[var(--stroke)] object-cover"
                              />
                            ) : (
                              <span className="inline-flex h-10 w-14 shrink-0 items-center justify-center border border-dashed border-[var(--stroke)] text-[10px] text-[var(--muted)]">
                                无图
                              </span>
                            )}
                            <div className="min-w-0">
                              <p>{status.label}</p>
                              <p className="text-xs text-[var(--muted)]">{status.hint}</p>
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="border-b border-[var(--stroke)] py-3">
                      {studio.is_active ? "是" : "否"}
                    </td>
                    <td className="border-b border-[var(--stroke)] py-3">
                      <div className="flex gap-2">
                        <button
                          className="btn-text"
                          onClick={() => openEditForm(studio)}
                        >
                          编辑
                        </button>
                        <button
                          className="btn-text"
                          onClick={() => handleDelete(studio.id)}
                          disabled={activeStudioId === studio.id}
                        >
                          {activeStudioId === studio.id ? "删除中..." : "删除"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredStudios.length === 0 && (
                  <tr>
                    <td className="py-5 text-sm text-[var(--muted)]" colSpan={5}>
                      {studios.length === 0 ? "暂无工作室" : "没有符合筛选的工作室"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-8">
          <div className="flex max-h-[calc(100vh-4rem)] w-full max-w-2xl flex-col border border-[var(--stroke)] bg-[var(--card)] p-5 shadow-xl">
            <div className="mb-4 flex shrink-0 items-center justify-between">
              <h2 className="text-lg font-medium">
                {form.id ? "编辑工作室" : "新增工作室"}
              </h2>
              <button type="button" className="btn-text" onClick={closeForm}>
                关闭
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="grid grid-cols-1 gap-4 overflow-y-auto pr-2"
            >
              <div>
                <label className="text-sm">名称</label>
                <input
                  className="mt-2 w-full rounded-none border border-[var(--stroke)] px-3 py-2"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-sm">官网</label>
                <input
                  className="mt-2 w-full rounded-none border border-[var(--stroke)] px-3 py-2"
                  value={form.website_url}
                  onChange={(e) =>
                    setForm({ ...form, website_url: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="text-sm">RSS / 抓取地址</label>
                <input
                  className="mt-2 w-full rounded-none border border-[var(--stroke)] px-3 py-2"
                  value={form.feed_url}
                  onChange={(e) => setForm({ ...form, feed_url: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm">兜底封面 URL（仅作品图加载失败时显示）</label>
                <input
                  className="mt-2 w-full rounded-none border border-[var(--stroke)] px-3 py-2"
                  value={form.cover_url}
                  onChange={(e) => setForm({ ...form, cover_url: e.target.value })}
                  placeholder="https://example.com/cover.jpg"
                />
                <CoverUploader
                  value={form.cover_url}
                  onChange={(url) => saveCoverUrl(url)}
                />
                {!form.id && (
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    新建工作室时，上传后请点击“新增工作室”保存。
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm">位置</label>
                <input
                  className="mt-2 w-full rounded-none border border-[var(--stroke)] px-3 py-2"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm">标签（逗号分隔）</label>
                <input
                  className="mt-2 w-full rounded-none border border-[var(--stroke)] px-3 py-2"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm({ ...form, is_active: e.target.checked })
                  }
                />
                是否启用
              </label>

              <div className="flex gap-3 pt-1">
                <button type="submit" className="btn">
                  {form.id ? "保存" : "新增工作室"}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setForm({ ...emptyForm })}
                >
                  清空表单
                </button>
              </div>

              {message && (
                <p className="whitespace-pre-wrap text-sm text-[var(--muted)]">
                  {message}
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StudiosLoadingSkeleton() {
  return (
    <>
      <div className="grid gap-4 md:hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <article key={index} className="border border-[var(--stroke)] bg-[var(--card)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="w-full min-w-0 space-y-3">
                <div className="admin-skeleton-line h-5 w-1/2" />
                <div className="admin-skeleton-line w-32" />
              </div>
              <div className="admin-skeleton-line h-3 w-10 shrink-0" />
            </div>
            <div className="mt-5 space-y-3">
              <div className="admin-skeleton-line w-3/4" />
              <div className="admin-skeleton-line w-2/3" />
              <div className="admin-skeleton-line w-28" />
            </div>
          </article>
        ))}
      </div>

      <table className="hidden w-full border-collapse text-sm md:table">
        <thead>
          <tr className="text-left">
            <th className="border-b border-[var(--stroke)] py-3">名称</th>
            <th className="border-b border-[var(--stroke)] py-3">官网</th>
            <th className="border-b border-[var(--stroke)] py-3">兜底封面</th>
            <th className="border-b border-[var(--stroke)] py-3">启用</th>
            <th className="border-b border-[var(--stroke)] py-3">操作</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, index) => (
            <tr key={index}>
              <td className="border-b border-[var(--stroke)] py-3">
                <div className="admin-skeleton-line w-24" />
              </td>
              <td className="border-b border-[var(--stroke)] py-3">
                <div className="admin-skeleton-line w-48" />
              </td>
              <td className="border-b border-[var(--stroke)] py-3">
                <div className="admin-skeleton-line w-52" />
              </td>
              <td className="border-b border-[var(--stroke)] py-3">
                <div className="admin-skeleton-line w-8" />
              </td>
              <td className="border-b border-[var(--stroke)] py-3">
                <div className="admin-skeleton-line w-20" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
