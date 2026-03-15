"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function CoverUploader({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);

    const ext = file.name.split(".").pop() || "jpg";
    const path = `cover_${Date.now()}.${ext}`;

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
    <div className="mt-2 flex items-center gap-3">
      <label className="btn cursor-pointer">
        {uploading ? "上传中..." : "上传封面图"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </label>
      {value && (
        <a href={value} className="btn-text" target="_blank" rel="noreferrer">
          查看已上传
        </a>
      )}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
