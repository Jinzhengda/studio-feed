"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UserMenu({
  isAuthed,
  avatarUrl
}: {
  isAuthed: boolean;
  avatarUrl?: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!avatarUrl) return;
    const image = new Image();
    image.src = avatarUrl;
  }, [avatarUrl]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setIsOpen(false);
    router.push("/login");
  }

  if (!isAuthed) {
    return (
      <Link href="/login" className="btn">
        登录
      </Link>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 w-10 rounded-full overflow-hidden border-2 border-[var(--stroke)] hover:border-black transition-colors"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="User avatar"
            className="h-full w-full object-cover"
            loading="eager"
          />
        ) : (
          <div className="h-full w-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-medium">
            U
          </div>
        )}
      </button>

      <div
        className={`absolute right-0 mt-2 w-48 rounded-lg border border-[var(--stroke)] bg-white py-2 shadow-lg transition-opacity ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
          <Link
            href="/admin/studios"
            className="block px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            工作室管理
          </Link>
          <Link
            href="/admin/works"
            className="block px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            作品管理
          </Link>
          <Link
            href="/admin/profile"
            className="block px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            个人设置
          </Link>
          <hr className="my-2 border-[var(--stroke)]" />
          <button
            onClick={handleLogout}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors text-red-600"
          >
            登出
          </button>
      </div>
    </div>
  );
}
