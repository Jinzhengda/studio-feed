"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { buttonClassName } from "@/components/Button";

export default function CoverUploader({
  value,
  onChange,
  className = "",
  showPreview = true,
}: {
  value: string;
  onChange: (url: string) => void;
  className?: string;
  showPreview?: boolean;
}) {
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("请先登录");
      setUploading(false);
      return;
    }
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/cover_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("studio-covers")
      .upload(path, file, {
        upsert: true,
        contentType: file.type || "image/jpeg",
      });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage
      .from("studio-covers")
      .getPublicUrl(path);

    if (data?.publicUrl) {
      onChange(data.publicUrl);
    }

    setUploading(false);
  }

  return (
    <div className={`mt-2 flex items-center gap-3 ${className}`.trim()}>
      <label className={buttonClassName({ variant: "secondary", className: "cursor-pointer" })}>
        {uploading ? "上传中..." : "上传封面图"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </label>
      {showPreview && value && (
        <a
          href={value}
          className={buttonClassName({ variant: "ghost" })}
          target="_blank"
          rel="noreferrer"
        >
          查看已上传
        </a>
      )}
      {error && (
        <span className="text-sm text-[var(--color-text-danger)]">{error}</span>
      )}
    </div>
  );
}
