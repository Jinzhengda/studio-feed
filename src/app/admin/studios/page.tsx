"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import CoverUploader from "@/components/CoverUploader";

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

  function showToast(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(""), 2000);
  }

  async function saveCoverUrl(url: string) {
    setForm((prev) => ({ ...prev, cover_url: url }));
    if (!form.id) return;
    const { error } = await supabase
      .from("studios")
      .update({ cover_url: url })
      .eq("id", form.id);
    if (error) {
      setMessage(error.message);
      return;
    }
    showToast("封面图已保存");
    loadStudios();
  }

  async function loadStudios() {
    setLoading(true);
    const { data } = await supabase
      .from("studios")
      .select("*")
      .order("created_at", { ascending: false });

    setStudios((data as Studio[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadStudios();
  }, []);

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

    if (form.id) {
      const { error } = await supabase
        .from("studios")
        .update(payload)
        .eq("id", form.id);

      if (error) {
        setMessage(error.message);
        return;
      }
      setMessage("已更新");
    } else {
      const { error } = await supabase.from("studios").insert(payload);

      if (error) {
        setMessage(error.message);
        return;
      }
      setMessage("已新增");
    }

    setForm({ ...emptyForm });
    loadStudios();
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除这个工作室吗？")) return;

    const { error } = await supabase.from("studios").delete().eq("id", id);
    if (error) {
      setMessage(error.message);
      return;
    }
    loadStudios();
  }

  async function refreshDemo() {
    setMessage("");
    const res = await fetch("/api/refresh-works", { method: "POST" });
    if (!res.ok) {
      setMessage("刷新失败，请检查登录状态");
      return;
    }
    showToast("已刷新作品数据");
  }

  return (
    <div>
      {toast && (
        <div className="fixed right-6 top-6 z-50 rounded-full border border-black/20 bg-white px-4 py-2 text-sm shadow-sm">
          {toast}
        </div>
      )}
      <h1 className="text-2xl font-semibold">工作室管理</h1>

      <form
        onSubmit={handleSave}
        className="mt-6 grid grid-cols-1 gap-4 rounded-2xl border border-[var(--stroke)] bg-white p-6"
      >
        <div>
          <label className="text-sm">名称</label>
          <input
            className="mt-2 w-full rounded-lg border border-[var(--stroke)] px-3 py-2"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="text-sm">官网</label>
          <input
            className="mt-2 w-full rounded-lg border border-[var(--stroke)] px-3 py-2"
            value={form.website_url}
            onChange={(e) => setForm({ ...form, website_url: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm">RSS / 抓取地址</label>
          <input
            className="mt-2 w-full rounded-lg border border-[var(--stroke)] px-3 py-2"
            value={form.feed_url}
            onChange={(e) => setForm({ ...form, feed_url: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm">封面图 URL（抓取失败时用）</label>
          <input
            className="mt-2 w-full rounded-lg border border-[var(--stroke)] px-3 py-2"
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
            className="mt-2 w-full rounded-lg border border-[var(--stroke)] px-3 py-2"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm">标签（逗号分隔）</label>
          <input
            className="mt-2 w-full rounded-lg border border-[var(--stroke)] px-3 py-2"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
          是否启用
        </label>

        <div className="flex gap-3">
          <button
            type="submit"
            className="btn"
          >
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

        {message && <p className="text-sm text-[var(--muted)]">{message}</p>}
      </form>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">工作室列表</h2>
          <button
            type="button"
            className="btn"
            onClick={refreshDemo}
          >
            刷新数据
          </button>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-[var(--muted)]">加载中...</p>
        ) : (
          <table className="mt-4 w-full border-collapse text-sm">
            <thead>
              <tr className="text-left">
                <th className="border-b border-[var(--stroke)] py-2">名称</th>
                <th className="border-b border-[var(--stroke)] py-2">官网</th>
                <th className="border-b border-[var(--stroke)] py-2">封面</th>
                <th className="border-b border-[var(--stroke)] py-2">启用</th>
                <th className="border-b border-[var(--stroke)] py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {studios.map((studio) => (
                <tr key={studio.id}>
                  <td className="border-b border-[var(--stroke)] py-2">
                    {studio.name}
                  </td>
                  <td className="border-b border-[var(--stroke)] py-2">
                    {studio.website_url || "-"}
                  </td>
                  <td className="border-b border-[var(--stroke)] py-2">
                    {studio.cover_url ? "已设置" : "未设置"}
                  </td>
                  <td className="border-b border-[var(--stroke)] py-2">
                    {studio.is_active ? "是" : "否"}
                  </td>
                  <td className="border-b border-[var(--stroke)] py-2">
                    <div className="flex gap-2">
                      <button
                        className="btn-text"
                        onClick={() =>
                          setForm({
                            id: studio.id,
                            name: studio.name,
                            website_url: studio.website_url || "",
                            feed_url: studio.feed_url || "",
                            cover_url: studio.cover_url || "",
                            location: studio.location || "",
                            tags: studio.tags || "",
                            is_active: studio.is_active,
                          })
                        }
                      >
                        编辑
                      </button>
                      <button
                        className="btn-text"
                        onClick={() => handleDelete(studio.id)}
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {studios.length === 0 && (
                <tr>
                  <td className="py-4 text-sm text-[var(--muted)]" colSpan={5}>
                    暂无工作室
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
