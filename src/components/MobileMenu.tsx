"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Archive,
  Contrast,
  Image as ImageIcon,
  Images,
  LogOut,
  Menu,
  Moon,
  ReceiptText,
  Sun,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AvatarImage from "./AvatarImage";
import ProfileSettingsModal from "./ProfileSettingsModal";
import { applyTheme } from "./ThemeToggle";
import {
  getCardMode,
  getServerCardMode,
  subscribeCardMode,
  updateCardMode,
  type CardMode,
} from "@/lib/card-mode";
import {
  getServerSortMode,
  getSortMode,
  subscribeSortMode,
  updateSortMode,
  type SortMode,
} from "@/lib/sort-mode";

type ThemeMode = "light" | "dark" | "system";
const THEME_STORAGE_KEY = "studio-feed-theme-mode";
const THEME_CHANGE_EVENT = "studio-feed-theme-change";

export default function MobileMenu({
  isAuthed,
  avatarUrl,
  showThemeToggle = false,
  onAvatarChange,
}: {
  isAuthed: boolean;
  avatarUrl?: string | null;
  showThemeToggle?: boolean;
  onAvatarChange?: (url: string) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const cardMode = useSyncExternalStore(
    subscribeCardMode,
    getCardMode,
    getServerCardMode,
  );
  const theme = useSyncExternalStore(subscribeThemeMode, getThemeMode, getServerThemeMode);
  const sortMode = useSyncExternalStore(
    subscribeSortMode,
    getSortMode,
    getServerSortMode,
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

  function chooseSortMode(nextMode: SortMode) {
    updateSortMode(nextMode);
  }

  function chooseTheme(nextTheme: ThemeMode) {
    applyTheme(nextTheme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  function chooseCardMode(nextMode: CardMode) {
    updateCardMode(nextMode);
  }

  function toggleMenu() {
    setIsOpen((value) => !value);
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={toggleMenu}
        className="site-header-avatar-button"
        aria-label="Menu"
        aria-expanded={isOpen}
      >
        <HeaderMenuIcon />
      </button>

      <div
        className={`menu-panel absolute right-0 top-full z-50 mt-1 w-[248px] overflow-hidden rounded-none border border-[var(--color-border-card)] bg-[var(--bg)] shadow-lg transition-opacity ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {isAuthed ? (
          <>
            <button
              type="button"
              className="menu-row w-full text-left"
              onClick={() => {
                setIsOpen(false);
                setIsProfileOpen(true);
              }}
            >
              <span className="menu-label">编辑资料</span>
              {avatarUrl ? (
                <AvatarImage
                  src={avatarUrl}
                  alt="Avatar"
                  size={32}
                  className="menu-avatar rounded-full object-cover"
                />
              ) : (
                <div className="menu-avatar flex items-center justify-center rounded-full bg-[var(--hover)] text-xs font-medium text-[var(--muted)]">
                  U
                </div>
              )}
            </button>
            <Link href="/admin/studios" className="menu-row" onClick={() => setIsOpen(false)}>
              <span className="menu-label">工作室管理</span>
              <StudioIcon />
            </Link>
            <Link href="/admin/works" className="menu-row" onClick={() => setIsOpen(false)}>
              <span className="menu-label">作品管理</span>
              <WorkIcon />
            </Link>
            <button onClick={handleLogout} className="menu-row menu-row-logout w-full text-left">
              <span className="menu-label">登出</span>
              <LogoutIcon />
            </button>

            {(pathname === "/" || showThemeToggle) && (
              <>
                <div
                  className="menu-divider"
                  style={{ height: 0, marginBottom: -1, borderTop: "1px solid var(--stroke)" }}
                />
                <div className="menu-control-section">
                  {pathname === "/" && (
                    <div className="menu-control-row menu-control-row-first">
                      <span className="menu-label">排序</span>
                      <SegmentedControl>
                        <button
                          type="button"
                          className={segmentClass(sortMode === "time")}
                          onClick={() => chooseSortMode("time")}
                        >
                          按时间
                        </button>
                        <button
                          type="button"
                          className={segmentClass(sortMode === "random")}
                          onClick={() => chooseSortMode("random")}
                        >
                          随机
                        </button>
                      </SegmentedControl>
                    </div>
                  )}

                  {showThemeToggle && (
                    <>
                      <div className="menu-control-row">
                        <span className="menu-label">主题</span>
                        <SegmentedControl>
                          <button
                            type="button"
                            className={iconSegmentClass(theme === "light")}
                            onClick={() => chooseTheme("light")}
                            aria-label="浅色模式"
                            aria-pressed={theme === "light"}
                            title="浅色模式"
                          >
                            <SunIcon />
                          </button>
                          <button
                            type="button"
                            className={iconSegmentClass(theme === "dark")}
                            onClick={() => chooseTheme("dark")}
                            aria-label="深色模式"
                            aria-pressed={theme === "dark"}
                            title="深色模式"
                          >
                            <MoonIcon />
                          </button>
                          <button
                            type="button"
                            className={iconSegmentClass(theme === "system")}
                            onClick={() => chooseTheme("system")}
                            aria-label="跟随系统"
                            aria-pressed={theme === "system"}
                            title="跟随系统"
                          >
                            <SystemIcon />
                          </button>
                        </SegmentedControl>
                      </div>
                      <div className="menu-control-row menu-control-row-card" style={{ paddingBottom: 12 }}>
                        <span className="menu-label">卡片</span>
                        <SegmentedControl>
                          <button
                            type="button"
                            className={iconSegmentClass(cardMode === "text")}
                            onClick={() => chooseCardMode("text")}
                            aria-label="纯图片卡片"
                            aria-pressed={cardMode === "text"}
                            title="纯图片卡片"
                          >
                            <ImageIcon aria-hidden="true" size={24} strokeWidth={1} />
                          </button>
                          <button
                            type="button"
                            className={iconSegmentClass(cardMode === "image")}
                            onClick={() => chooseCardMode("image")}
                            aria-label="图文卡片"
                            aria-pressed={cardMode === "image"}
                            title="图文卡片"
                          >
                            <ReceiptText aria-hidden="true" size={24} strokeWidth={1} />
                          </button>
                        </SegmentedControl>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <Link href="/login" className="menu-row" onClick={() => setIsOpen(false)}>
              <span className="menu-label">登录</span>
              <LogoutIcon className="rotate-180" />
            </Link>
          </>
        )}
      </div>

      <ProfileSettingsModal
        open={isProfileOpen}
        avatarUrl={avatarUrl}
        onClose={() => setIsProfileOpen(false)}
        onAvatarChange={onAvatarChange}
      />
    </div>
  );
}

export function HeaderMenuIcon() {
  return <Menu aria-hidden="true" className="h-6 w-6" size={24} strokeWidth={1} />;
}

function SegmentedControl({ children }: { children: React.ReactNode }) {
  return <div className="menu-toggle">{children}</div>;
}

function segmentClass(active: boolean) {
  return `menu-toggle-option ${
    active ? "menu-toggle-option-active" : "menu-toggle-option-idle"
  }`;
}

function iconSegmentClass(active: boolean) {
  return `menu-icon-toggle ${
    active ? "menu-toggle-option-active" : "menu-toggle-option-idle"
  }`;
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

function getThemeMode(): ThemeMode {
  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeMode(savedTheme) ? savedTheme : "system";
}

function getServerThemeMode(): ThemeMode {
  return "system";
}

function subscribeThemeMode(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(THEME_CHANGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(THEME_CHANGE_EVENT, callback);
  };
}

function StudioIcon() {
  return <Archive aria-hidden="true" size={24} strokeWidth={1} />;
}

function WorkIcon() {
  return <Images aria-hidden="true" size={24} strokeWidth={1} />;
}

function LogoutIcon({ className = "" }: { className?: string }) {
  return <LogOut aria-hidden="true" className={className} size={24} strokeWidth={1} />;
}

function SunIcon() {
  return <Sun aria-hidden="true" size={24} strokeWidth={1} />;
}

function MoonIcon() {
  return <Moon aria-hidden="true" size={24} strokeWidth={1} />;
}

function SystemIcon() {
  return <Contrast aria-hidden="true" size={24} strokeWidth={1} />;
}
