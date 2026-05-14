"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function MobileMenu({
  isAuthed,
  avatarUrl,
  showNavLinks = false
}: {
  isAuthed: boolean;
  avatarUrl?: string | null;
  showNavLinks?: boolean;
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

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Menu"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <div
        className={`absolute right-0 z-50 mt-2 w-48 rounded-lg border border-[var(--stroke)] bg-white py-2 shadow-lg transition-opacity ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
          {showNavLinks && (
            <>
              <Link
                href="/about"
                className="block px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                About
              </Link>
              <Link
                href="/contact"
                className="block px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Contact
              </Link>
              <hr className="my-2 border-[var(--stroke)]" />
            </>
          )}

          {isAuthed ? (
            <>
              <div className="px-4 py-2 flex items-center gap-2">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="h-8 w-8 rounded-full object-cover"
                    loading="eager"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium">
                    U
                  </div>
                )}
                <span className="text-sm text-[var(--muted)]">已登录</span>
              </div>
              <hr className="my-2 border-[var(--stroke)]" />
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
            </>
          ) : (
            <Link
              href="/login"
              className="block px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              登录
            </Link>
          )}
      </div>
    </div>
  );
}
