"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState("");

  const loadProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    setUserId(user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .single();

    if (profile?.avatar_url) {
      setAvatarUrl(profile.avatar_url);
    }
  }, [router, supabase]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);
      setMessage("");

      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("public2")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("public2")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        });

      if (updateError) {
        throw updateError;
      }

      setAvatarUrl(publicUrl);
      setMessage("头像上传成功！");
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">个人设置</h1>

      <div className="mt-6 max-w-md">
        <label className="text-sm font-medium">用户头像</label>
        <div className="mt-4 flex items-center gap-6">
          <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-[var(--stroke)]">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gray-200 flex items-center justify-center text-gray-600 text-2xl font-medium">
                U
              </div>
            )}
          </div>

          <div>
            <label className="btn cursor-pointer rounded-none">
              {uploading ? "上传中..." : "上传头像"}
              <input
                type="file"
                accept="image/*"
                onChange={uploadAvatar}
                disabled={uploading}
                className="hidden"
              />
            </label>
            <p className="mt-2 text-xs text-[var(--muted)]">
              支持 JPG、PNG 格式
            </p>
          </div>
        </div>

        {message && (
          <p className="mt-4 text-sm text-[var(--muted)]">{message}</p>
        )}
      </div>
    </div>
  );
}
