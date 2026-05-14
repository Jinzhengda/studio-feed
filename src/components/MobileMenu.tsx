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
  const [isDark, setIsDark] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark")
  );
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

  function toggleTheme() {
    setIsDark((current) => {
      const next = !current;
      document.documentElement.classList.toggle("dark", next);
      window.localStorage.setItem("studio-feed-theme", next ? "dark" : "light");
      return next;
    });
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-[var(--stroke)] transition-colors hover:bg-black/5"
        aria-label="Menu"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Avatar"
            className="h-full w-full object-cover"
            loading="eager"
          />
        ) : (
          <span className="text-sm font-medium">U</span>
        )}
      </button>

      <div
        className={`absolute right-0 z-50 mt-2 w-52 rounded-none border border-[var(--stroke)] bg-[var(--card)] py-2 shadow-lg transition-opacity ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
          {showNavLinks && (
            <>
              <Link
                href="/about"
                className="block px-4 py-2 text-sm transition-colors hover:bg-[var(--hover)]"
                onClick={() => setIsOpen(false)}
              >
                About
              </Link>
              <Link
                href="/contact"
                className="block px-4 py-2 text-sm transition-colors hover:bg-[var(--hover)]"
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
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--hover)] text-xs font-medium text-[var(--muted)]">
                    U
                  </div>
                )}
                <span className="text-sm text-[var(--muted)]">已登录</span>
              </div>
              <hr className="my-2 border-[var(--stroke)]" />
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors hover:bg-[var(--hover)]"
                onClick={toggleTheme}
              >
                <span>暗色模式</span>
                <span
                  className={`relative h-5 w-9 rounded-full border transition-colors ${
                    isDark
                      ? "border-white bg-white"
                      : "border-black/30 bg-white"
                  }`}
                >
                  <span
                    className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full transition-transform ${
                      isDark
                        ? "translate-x-4 bg-black"
                        : "translate-x-1 bg-black"
                    }`}
                  />
                </span>
              </button>
              <hr className="my-2 border-[var(--stroke)]" />
              <Link
                href="/admin/studios"
                className="block px-4 py-2 text-sm transition-colors hover:bg-[var(--hover)]"
                onClick={() => setIsOpen(false)}
              >
                工作室管理
              </Link>
              <Link
                href="/admin/works"
                className="block px-4 py-2 text-sm transition-colors hover:bg-[var(--hover)]"
                onClick={() => setIsOpen(false)}
              >
                作品管理
              </Link>
              <Link
                href="/admin/profile"
                className="block px-4 py-2 text-sm transition-colors hover:bg-[var(--hover)]"
                onClick={() => setIsOpen(false)}
              >
                个人设置
              </Link>
              <hr className="my-2 border-[var(--stroke)]" />
              <button
                onClick={handleLogout}
                className="block w-full px-4 py-2 text-left text-sm text-red-600 transition-colors hover:bg-[var(--hover)]"
              >
                登出
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="block px-4 py-2 text-sm transition-colors hover:bg-[var(--hover)]"
              onClick={() => setIsOpen(false)}
            >
              登录
            </Link>
          )}
      </div>
    </div>
  );
}
