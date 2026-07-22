"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import AvatarImage from "./AvatarImage";
import { buttonClassName } from "./Button";

type ProfileSettingsModalProps = {
  open: boolean;
  avatarUrl?: string | null;
  onClose: () => void;
  onAvatarChange?: (url: string) => void;
};

export default function ProfileSettingsModal({
  open,
  avatarUrl: initialAvatarUrl,
  onClose,
  onAvatarChange,
}: ProfileSettingsModalProps) {
  const supabase = useMemo(() => createClient(), []);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl || "");
  const [userId, setUserId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setAvatarUrl(initialAvatarUrl || "");
  }, [initialAvatarUrl]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      const currentPaddingRight = Number.parseFloat(
        window.getComputedStyle(document.body).paddingRight,
      ) || 0;
      document.body.style.paddingRight = `${currentPaddingRight + scrollbarWidth}px`;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      document.documentElement.style.overflow = previousDocumentOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    async function loadUserId() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!cancelled && user) setUserId(user.id);
    }

    void loadUserId();
    return () => {
      cancelled = true;
    };
  }, [open, supabase]);

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !userId) return;

    try {
      setUploading(true);
      setMessage("");

      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${userId}/${userId}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("public2")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: signedData, error: signedError } = await supabase.storage
        .from("public2")
        .createSignedUrl(filePath, 3600);
      if (signedError || !signedData?.signedUrl) {
        throw signedError || new Error("头像地址生成失败");
      }

      const { error: updateError } = await supabase.from("profiles").upsert({
        id: userId,
        avatar_url: filePath,
        updated_at: new Date().toISOString(),
      });
      if (updateError) throw updateError;

      setAvatarUrl(signedData.signedUrl);
      onAvatarChange?.(signedData.signedUrl);
      setMessage("头像上传成功");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="profile-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="profile-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-settings-title"
      >
        <header className="profile-modal__header">
          <h2 id="profile-settings-title" className="profile-modal__title">
            个人设置
          </h2>
          <button
            type="button"
            className={buttonClassName({ variant: "secondary", className: "profile-modal__close" })}
            onClick={onClose}
          >
            关闭
          </button>
        </header>

        <div className="profile-modal__body">
          <div className="profile-modal__avatar">
            {avatarUrl ? (
              <AvatarImage
                src={avatarUrl}
                alt="用户头像"
                size={120}
                className="h-full w-full object-cover"
              />
            ) : (
              <Image
                src="/profile/avatar-placeholder.svg"
                alt="默认头像"
                width={120}
                height={120}
                unoptimized
                className="h-full w-full object-cover"
              />
            )}
          </div>

          <div className="profile-modal__upload">
            <label
              className={buttonClassName({
                variant: "secondary",
                className: "profile-modal__upload-button",
              })}
            >
              {uploading ? "上传中..." : "更改头像"}
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={uploadAvatar}
                disabled={uploading}
                className="sr-only"
              />
            </label>
            <p className="profile-modal__hint">支持 JPG、PNG 格式</p>
            {message && <p className="profile-modal__message">{message}</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
