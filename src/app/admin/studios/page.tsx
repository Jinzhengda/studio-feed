"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Studio = {
  id: string;
  name: string;
  website_url: string | null;
  feed_url: string | null;
  location: string | null;
  tags: string | null;
  is_active: boolean;
};

const emptyForm = {
  id: "",
  name: "",
  website_url: "",
  feed_url: "",
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
    setMessage("已刷新示例数据");
  }

  return (
    <div>
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
            className="rounded-lg border border-black px-4 py-2 text-sm"
          >
            {form.id ? "保存" : "新增工作室"}
          </button>
          <button
            type="button"
            className="rounded-lg border border-black px-4 py-2 text-sm"
            onClick={() => setForm({ ...emptyForm })}
          >
            清空表单
          </button>
          <button
            type="button"
            className="rounded-lg border border-black px-4 py-2 text-sm"
            onClick={refreshDemo}
          >
            刷新示例数据
          </button>
        </div>

        {message && <p className="text-sm text-[var(--muted)]">{message}</p>}
      </form>

      <div className="mt-8">
        <h2 className="text-lg font-medium">工作室列表</h2>

        {loading ? (
          <p className="mt-4 text-sm text-[var(--muted)]">加载中...</p>
        ) : (
          <table className="mt-4 w-full border-collapse text-sm">
            <thead>
              <tr className="text-left">
                <th className="border-b border-[var(--stroke)] py-2">名称</th>
                <th className="border-b border-[var(--stroke)] py-2">官网</th>
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
                    {studio.is_active ? "是" : "否"}
                  </td>
                  <td className="border-b border-[var(--stroke)] py-2">
                    <div className="flex gap-2">
                      <button
                        className="text-sm underline"
                        onClick={() =>
                          setForm({
                            id: studio.id,
                            name: studio.name,
                            website_url: studio.website_url || "",
                            feed_url: studio.feed_url || "",
                            location: studio.location || "",
                            tags: studio.tags || "",
                            is_active: studio.is_active,
                          })
                        }
                      >
                        编辑
                      </button>
                      <button
                        className="text-sm underline"
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
                  <td className="py-4 text-sm text-[var(--muted)]" colSpan={4}>
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
