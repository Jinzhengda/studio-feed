"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import CoverUploader from "@/components/CoverUploader";
import InputField from "@/components/InputField";
import Button from "@/components/Button";
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
  refresh_started_at: string | null;
  last_refreshed_at: string | null;
  refresh_error: string | null;
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
  const searchParams = useSearchParams();

  const [studios, setStudios] = useState<Studio[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [startingRefresh, setStartingRefresh] = useState(false);
  const [refreshingList, setRefreshingList] = useState(false);
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

  async function loadStudios({ silent = false }: { silent?: boolean } = {}) {
    if (!silent) setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStudios([]);
        setLatestWorkThumbByStudioId({});
        return;
      }
      const [{ data: studioRows }, { data: workRows }] = await Promise.all([
        supabase
          .from("studios")
          .select("*")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("works")
          .select("studio_id,thumbnail_url,work_url,first_seen_at,studios!inner(owner_id)")
          .eq("studios.owner_id", user.id)
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
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadStudios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (searchParams.get("new") === "1") openCreateForm();
  }, [searchParams]);

  const refreshingStudioCount = studios.filter(
    (studio) => Boolean(studio.refresh_started_at),
  ).length;
  const isBackgroundRefreshing = refreshingStudioCount > 0;

  useEffect(() => {
    if (!isBackgroundRefreshing) return;

    const interval = window.setInterval(() => {
      void loadStudios({ silent: true });
    }, 3000);

    return () => window.clearInterval(interval);
    // loadStudios intentionally stays local to this component; this effect only reacts to job state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBackgroundRefreshing]);

  useEffect(() => {
    if (!isFormOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPaddingRight = document.body.style.paddingRight;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    const bodyPaddingRight = Number.parseFloat(
      window.getComputedStyle(document.body).paddingRight,
    );

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${bodyPaddingRight + scrollbarWidth}px`;
    }

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.paddingRight = previousBodyPaddingRight;
      document.documentElement.style.overflow = previousDocumentOverflow;
    };
  }, [isFormOpen]);

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
        const response = await fetch(`/api/studios/${form.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "更新失败");
        showToast("已更新");
      } else {
        const response = await fetch("/api/studios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "新增失败");
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
      const response = await fetch(`/api/studios/${id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "删除失败");
      showToast("已删除");
      await loadStudios();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除失败");
    } finally {
      setActiveStudioId(null);
    }
  }

  async function refreshList() {
    setRefreshingList(true);
    try {
      await loadStudios({ silent: true });
      showToast("列表已更新");
    } finally {
      setRefreshingList(false);
    }
  }

  async function startBackgroundRefresh() {
    setMessage("");
    setStartingRefresh(true);
    try {
      const res = await fetch("/api/refresh-works", { method: "POST" });
      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        showToast(errorBody?.error || "刷新失败（" + res.status + "）");
        return;
      }
      const result = await res.json();
      await loadStudios({ silent: true });
      showToast(`已开始抓取 ${result.studioCount ?? 0} 家工作室，可继续操作`);
    } catch (e) {
      showToast("请求失败：" + (e instanceof Error ? e.message : String(e)));
    } finally {
      setStartingRefresh(false);
    }
  }

  return (
    <div className="admin-studios-page">
      {toast && (
        <div className="fixed left-1/2 top-6 z-[9999] -translate-x-1/2 rounded-full border border-[var(--color-border-default)] bg-[var(--color-text-primary)] px-4 py-2 text-sm text-[var(--bg)] shadow-lg">
          {toast}
        </div>
      )}
      <div>
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

        <div className="admin-filter-bar">
          <div className="admin-filter-tools">
            <InputField
              inputType="search"
              containerClassName="admin-search-field"
              aria-label="搜索工作室"
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
          <div className="admin-toolbar-actions">
            <Button
              type="button"
              variant="secondary"
              className="admin-toolbar-button"
              onClick={refreshList}
              loading={refreshingList}
            >
              {refreshingList ? "刷新中" : "刷新列表"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="admin-toolbar-button"
              onClick={startBackgroundRefresh}
              loading={startingRefresh}
              disabled={isBackgroundRefreshing}
            >
              {isBackgroundRefreshing
                ? `抓取中 ${refreshingStudioCount}/${studios.length}`
                : startingRefresh
                  ? "提交中"
                  : "抓取最新作品"}
            </Button>
            <Button
              type="button"
              className="admin-toolbar-button admin-toolbar-button-primary"
              onClick={openCreateForm}
            >
              新增工作室
            </Button>
          </div>
        </div>

        {isBackgroundRefreshing && (
          <p className="admin-refresh-status" role="status">
            正在后台抓取 {refreshingStudioCount} 家工作室，页面可继续操作。
          </p>
        )}

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
                  <div className="mt-4 flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      className="admin-row-action"
                      onClick={() => openEditForm(studio)}
                    >
                      编辑
                    </Button>
                    <Button
                      variant="danger"
                      className="admin-row-action admin-row-delete"
                      onClick={() => handleDelete(studio.id)}
                      loading={activeStudioId === studio.id}
                    >
                      {activeStudioId === studio.id ? "删除中" : "删除"}
                    </Button>
                  </div>
                </article>
              ))}
              {filteredStudios.length === 0 && (
                <p className="text-sm text-[var(--muted)]">
                  {studios.length === 0 ? "暂无工作室" : "没有符合筛选的工作室"}
                </p>
              )}
            </div>

            <table className="admin-studios-table hidden w-full table-fixed border-collapse text-sm md:table">
              <colgroup>
                <col className="admin-col-name" />
                <col className="admin-col-website" />
                <col className="admin-col-cover" />
                <col className="admin-col-status" />
                <col className="admin-col-actions" />
              </colgroup>
              <thead className="sr-only">
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
                    <td className="admin-table-cell admin-name-cell">
                      {studio.name}
                    </td>
                    <td className="admin-table-cell admin-website-cell">
                      <span className="block truncate">{studio.website_url || "-"}</span>
                    </td>
                    <td className="admin-table-cell admin-cover-cell">
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
                            <div className="min-w-0 py-1">
                              <p className="leading-[21px]">{status.label}</p>
                              <p className="truncate text-xs leading-[18px] text-[var(--muted)]">{status.hint}</p>
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="admin-table-cell admin-status-cell">
                      {studio.is_active ? "是" : "否"}
                    </td>
                    <td className="admin-table-cell admin-actions-cell">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          className="admin-row-action"
                          onClick={() => openEditForm(studio)}
                        >
                          编辑
                        </Button>
                        <Button
                          variant="danger"
                          className="admin-row-action admin-row-delete"
                          onClick={() => handleDelete(studio.id)}
                          loading={activeStudioId === studio.id}
                        >
                          {activeStudioId === studio.id ? "删除中" : "删除"}
                        </Button>
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
        <div
          className="admin-studio-modal-backdrop fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
          role="presentation"
        >
          <div
            className="admin-studio-modal flex max-h-[calc(100vh-4rem)] w-full flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="studio-form-title"
          >
            <div className="admin-studio-modal__header flex shrink-0 items-center justify-between">
              <h2 id="studio-form-title" className="admin-studio-modal__title">
                {form.id ? "编辑工作室" : "新增工作室"}
              </h2>
              <Button
                type="button"
                variant="secondary"
                className="admin-studio-modal__close"
                onClick={closeForm}
              >
                关闭
              </Button>
            </div>

            <form
              onSubmit={handleSave}
              className="admin-studio-modal__form grid grid-cols-1"
            >
              <InputField
                label="工作室名称"
                containerClassName="admin-studio-modal__field"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />

              <InputField
                label="官网链接"
                containerClassName="admin-studio-modal__field"
                type="url"
                value={form.website_url}
                onChange={(e) =>
                  setForm({ ...form, website_url: e.target.value })
                }
              />

              <InputField
                label="RSS / 抓取地址"
                containerClassName="admin-studio-modal__field"
                type="url"
                value={form.feed_url}
                onChange={(e) => setForm({ ...form, feed_url: e.target.value })}
              />

              <div className="admin-studio-modal__field">
                <label className="sf-input__label" htmlFor="studio-cover-url">
                  兜底封面 URL（仅作品图加载失败时显示）
                </label>
                <div className="admin-studio-modal__cover-row">
                  <div className="sf-input__control admin-studio-modal__cover-input">
                    <input
                      id="studio-cover-url"
                      type="url"
                      value={form.cover_url}
                      onChange={(e) => setForm({ ...form, cover_url: e.target.value })}
                      placeholder="https://example.com/cover.jpg"
                      className="sf-input__native"
                    />
                  </div>
                  <CoverUploader
                    value={form.cover_url}
                    onChange={(url) => saveCoverUrl(url)}
                    className="admin-studio-modal__cover-uploader"
                    showPreview={false}
                  />
                </div>
              </div>

              <label className="admin-studio-modal__visibility">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={form.is_active}
                  onChange={(event) =>
                    setForm({ ...form, is_active: event.target.checked })
                  }
                />
                <span className="admin-studio-modal__visibility-indicator" aria-hidden="true">
                  {form.is_active && <Check size={12} strokeWidth={2} />}
                </span>
                显示在列表
              </label>

              <div className="admin-studio-modal__actions flex">
                <Button type="submit" className="admin-studio-modal__submit">
                  {form.id ? "保存" : "新增工作室"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="admin-studio-modal__reset"
                  onClick={() => setForm({ ...emptyForm })}
                >
                  清空表单
                </Button>
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
