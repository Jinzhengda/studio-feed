"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Work = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  work_url: string | null;
  published_at: string | null;
  is_visible: boolean;
  studios?: { name: string } | null;
};

export default function WorksAdminPage() {
  const supabase = createClient();
  const [works, setWorks] = useState<Work[]>([]);
  const [message, setMessage] = useState("");

  async function loadWorks() {
    const { data } = await supabase
      .from("works")
      .select("id,title,thumbnail_url,work_url,published_at,is_visible, studios(name)")
      .order("published_at", { ascending: false });

    setWorks((data as Work[]) || []);
  }

  useEffect(() => {
    loadWorks();
  }, []);

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

  return (
    <div>
      <h1 className="text-2xl font-semibold">作品管理</h1>

      {message && <p className="mt-4 text-sm text-[var(--muted)]">{message}</p>}

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="text-left">
            <th className="border-b border-[var(--stroke)] py-2">作品</th>
            <th className="border-b border-[var(--stroke)] py-2">工作室</th>
            <th className="border-b border-[var(--stroke)] py-2">发布时间</th>
            <th className="border-b border-[var(--stroke)] py-2">可见</th>
            <th className="border-b border-[var(--stroke)] py-2">操作</th>
          </tr>
        </thead>
        <tbody>
          {works.map((work) => (
            <tr key={work.id}>
              <td className="border-b border-[var(--stroke)] py-2">
                {work.title}
              </td>
              <td className="border-b border-[var(--stroke)] py-2">
                {work.studios?.name || "-"}
              </td>
              <td className="border-b border-[var(--stroke)] py-2">
                {work.published_at
                  ? new Date(work.published_at).toLocaleDateString()
                  : "-"}
              </td>
              <td className="border-b border-[var(--stroke)] py-2">
                {work.is_visible ? "是" : "否"}
              </td>
              <td className="border-b border-[var(--stroke)] py-2">
                <div className="flex gap-2">
                  <button
                    className="text-sm underline"
                    onClick={() => toggleVisible(work)}
                  >
                    切换可见性
                  </button>
                  <button
                    className="text-sm underline"
                    onClick={() => handleDelete(work.id)}
                  >
                    删除
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {works.length === 0 && (
            <tr>
              <td className="py-4 text-sm text-[var(--muted)]" colSpan={5}>
                暂无作品
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
