"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AvatarImage from "./AvatarImage";
import { applyTheme } from "./ThemeToggle";

type ThemeMode = "light" | "dark" | "system";
const THEME_STORAGE_KEY = "studio-feed-theme-mode";

export default function MobileMenu({
  isAuthed,
  avatarUrl,
  showNavLinks = false,
  showThemeToggle = false,
}: {
  isAuthed: boolean;
  avatarUrl?: string | null;
  showNavLinks?: boolean;
  showThemeToggle?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";

    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(savedTheme) ? savedTheme : "system";
  });
  const menuRef = useRef<HTMLDivElement>(null);
  const sortMode = searchParams.get("sort") === "random" ? "random" : "time";

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

  function chooseSortMode(nextMode: "time" | "random") {
    const params = new URLSearchParams(searchParams.toString());

    if (nextMode === "random") {
      params.set("sort", "random");
      params.set("seed", String(createRandomSeed()));
    } else {
      params.delete("sort");
      params.delete("seed");
    }

    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  }

  function chooseTheme(nextTheme: ThemeMode) {
    applyTheme(nextTheme);
    setTheme(nextTheme);
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[#e5e5e5] transition-colors hover:bg-black/5"
        aria-label="Menu"
      >
        {avatarUrl ? (
          <AvatarImage
            src={avatarUrl}
            alt="Avatar"
            size={36}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-sm font-medium">U</span>
        )}
      </button>

      <div
        className={`menu-panel absolute right-0 z-50 mt-2 w-[240px] overflow-hidden rounded-none border border-[var(--stroke)] bg-[var(--bg)] shadow-lg transition-opacity ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {isAuthed ? (
          <>
            <Link href="/admin/profile" className="menu-row" onClick={() => setIsOpen(false)}>
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
            </Link>
            <Link href="/admin/studios" className="menu-row" onClick={() => setIsOpen(false)}>
              <span className="menu-label">工作室管理</span>
              <StudioIcon />
            </Link>
            <Link href="/admin/works" className="menu-row" onClick={() => setIsOpen(false)}>
              <span className="menu-label">作品管理</span>
              <WorkIcon />
            </Link>
            {showNavLinks && (
              <>
                <Link href="/about" className="menu-row" onClick={() => setIsOpen(false)}>
                  <span className="menu-label">关于项目</span>
                  <InfoIcon />
                </Link>
                <Link href="/contact" className="menu-row" onClick={() => setIsOpen(false)}>
                  <span className="menu-label">联系作者</span>
                  <MailIcon />
                </Link>
              </>
            )}
            <button onClick={handleLogout} className="menu-row menu-row-logout w-full text-left">
              <span className="menu-label text-[#e7010b]">登出</span>
              <LogoutIcon />
            </button>

            {(pathname === "/" || showThemeToggle) && (
              <>
                <div className="menu-divider" />
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
                    <div className="menu-control-row">
                      <span className="menu-label">主题</span>
                      <SegmentedControl>
                        <button
                          type="button"
                          className={iconSegmentClass(theme === "light")}
                          onClick={() => chooseTheme("light")}
                          aria-label="浅色模式"
                        >
                          <SunIcon />
                        </button>
                        <button
                          type="button"
                          className={iconSegmentClass(theme === "dark")}
                          onClick={() => chooseTheme("dark")}
                          aria-label="深色模式"
                        >
                          <MoonIcon />
                        </button>
                        <button
                          type="button"
                          className={iconSegmentClass(theme === "system")}
                          onClick={() => chooseTheme("system")}
                          aria-label="跟随系统"
                        >
                          <SystemIcon />
                        </button>
                      </SegmentedControl>
                    </div>
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
            {showNavLinks && (
              <>
                <Link href="/about" className="menu-row" onClick={() => setIsOpen(false)}>
                  <span className="menu-label">关于项目</span>
                  <InfoIcon />
                </Link>
                <Link href="/contact" className="menu-row" onClick={() => setIsOpen(false)}>
                  <span className="menu-label">联系作者</span>
                  <MailIcon />
                </Link>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
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

function createRandomSeed() {
  if (typeof window !== "undefined" && window.crypto) {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return values[0];
  }

  return Math.floor(Math.random() * 2 ** 32);
}

function MenuIconShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`h-6 w-6 ${className}`}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function StudioIcon() {
  return (
    <MenuIconShell>
      <path d="M6.7501 3.75002H17.2501" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.75 7.25005H19.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.1556 10.75H4.84443C3.53308 10.75 2.57655 11.9908 2.91028 13.259L4.35765 18.759C4.58887 19.6376 5.38326 20.25 6.2918 20.25H17.7082C18.6168 20.25 19.4112 19.6376 19.6424 18.759L21.0897 13.259C21.4235 11.9908 20.4669 10.75 19.1556 10.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </MenuIconShell>
  );
}

function WorkIcon() {
  return (
    <MenuIconShell>
      <path fillRule="evenodd" clipRule="evenodd" d="M3.0001 5.74998C3.0001 4.2312 4.23132 2.99998 5.7501 2.99998H18.2501C19.7689 2.99998 21.0001 4.2312 21.0001 5.74998V18.25C21.0001 19.7688 19.7689 21 18.2501 21H5.7501C4.23132 21 3.0001 19.7688 3.0001 18.25V5.74998ZM5.7501 4.49998C5.05974 4.49998 4.5001 5.05962 4.5001 5.74998V14.4393L6.05556 12.8839C7.1295 11.8099 8.8707 11.8099 9.94464 12.8839L16.5608 19.5H18.2501C18.9405 19.5 19.5001 18.9404 19.5001 18.25V5.74998C19.5001 5.05962 18.9405 4.49998 18.2501 4.49998H5.7501ZM14.4394 19.5L8.88398 13.9445C8.39583 13.4564 7.60437 13.4564 7.11622 13.9445L4.5001 16.5607V18.25C4.5001 18.9404 5.05974 19.5 5.7501 19.5H14.4394Z" fill="currentColor" />
      <path d="M13.4255 8.53726C13.4738 8.51307 13.5131 8.47384 13.5373 8.42545L14.2764 6.9472C14.3685 6.76294 14.6315 6.76294 14.7236 6.9472L15.4627 8.42545C15.4869 8.47384 15.5262 8.51307 15.5745 8.53726L17.0528 9.27638C17.237 9.36851 17.237 9.63147 17.0528 9.7236L15.5745 10.4627C15.5262 10.4869 15.4869 10.5262 15.4627 10.5745L14.7236 12.0528C14.6315 12.237 14.3685 12.237 14.2764 12.0528L13.5373 10.5745C13.5131 10.5262 13.4738 10.4869 13.4255 10.4627L11.9472 9.7236C11.763 9.63147 11.763 9.36851 11.9472 9.27638L13.4255 8.53726Z" fill="currentColor" />
    </MenuIconShell>
  );
}

function InfoIcon() {
  return (
    <MenuIconShell>
      <path d="M12.0001 14V10.5M9.29432 18.4836L11.3594 20.2147C11.7293 20.5248 12.268 20.5263 12.6398 20.2183L14.7381 18.4799C14.9174 18.3313 15.1431 18.25 15.376 18.25H18.2501C19.3547 18.25 20.2501 17.3546 20.2501 16.25V5.75001C20.2501 4.64544 19.3547 3.75001 18.2501 3.75001H5.7501C4.64553 3.75001 3.7501 4.64544 3.7501 5.75001V16.25C3.7501 17.3546 4.64553 18.25 5.7501 18.25H8.65192C8.88685 18.25 9.11428 18.3327 9.29432 18.4836Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12.0001 7.99999H12.0106" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </MenuIconShell>
  );
}

function MailIcon() {
  return (
    <MenuIconShell>
      <path d="M21.2502 6.75H20.5002V17.25H21.2502H22.0002V6.75H21.2502ZM4.7502 4.75V5.5H19.2502V4.75V4H4.7502V4.75ZM2.7502 17.25H3.5002V6.75H2.7502H2.0002V17.25H2.7502ZM19.2502 19.25V18.5H4.7502V19.25V20H19.2502V19.25ZM2.7502 17.25H2.0002C2.0002 18.7688 3.23142 20 4.7502 20V19.25V18.5C4.05984 18.5 3.5002 17.9404 3.5002 17.25H2.7502ZM4.7502 4.75V4C3.23142 4 2.0002 5.23122 2.0002 6.75H2.7502H3.5002C3.5002 6.05964 4.05984 5.5 4.7502 5.5V4.75ZM21.2502 17.25H20.5002C20.5002 17.9404 19.9406 18.5 19.2502 18.5V19.25V20C20.769 20 22.0002 18.7688 22.0002 17.25H21.2502ZM21.2502 6.75H22.0002C22.0002 5.23122 20.769 4 19.2502 4V4.75V5.5C19.9406 5.5 20.5002 6.05964 20.5002 6.75H21.2502Z" fill="currentColor" />
      <path d="M21.2502 7.99998L12.9001 12.2073C12.3341 12.4925 11.6663 12.4925 11.1002 12.2073L2.7502 7.99998" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </MenuIconShell>
  );
}

function LogoutIcon({ className = "" }: { className?: string }) {
  return (
    <MenuIconShell className={className}>
      <path d="M20.2501 12H9.0001M15.7501 7.5L20.2501 12L15.7501 16.5M11.2501 20.25H5.7501C4.64553 20.25 3.7501 19.3546 3.7501 18.25V5.75C3.7501 4.64543 4.64553 3.75 5.7501 3.75H11.2501" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </MenuIconShell>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 19.2 19.2" fill="none" className="h-[19.2px] w-[19.2px]" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M12.5698 6.63014C14.21 8.27031 14.21 10.9297 12.5698 12.5698C10.9296 14.2101 8.27027 14.2101 6.6301 12.5698C4.9899 10.9297 4.9899 8.27031 6.6301 6.63014C8.27027 4.98994 10.9296 4.98994 12.5698 6.63014Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.6 2.6V0.6M9.6 18.6V16.6M16.6 9.6H18.6M0.6 9.6H2.6M4.65026 4.65026L3.23604 3.23604M15.964 15.964L14.5498 14.5498M14.5498 4.65026L15.964 3.23605M3.23605 15.964L4.65026 14.5498" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 19.2 19.2" fill="none" className="h-[19.2px] w-[19.2px]" aria-hidden="true">
      <path d="M16.9983 9.44897C16.151 10.048 15.1165 10.4 13.9999 10.4C11.1279 10.4 8.79985 8.07193 8.79985 5.20001C8.79985 4.08333 9.15185 3.04887 9.75089 2.20152C9.70065 2.20051 9.65033 2.20001 9.59985 2.20001C5.51295 2.20001 2.19985 5.5131 2.19985 9.60001C2.19985 13.6869 5.51295 17 9.59985 17C13.6867 17 16.9999 13.6869 16.9999 9.60001C16.9999 9.54953 16.9994 9.49921 16.9983 9.44897Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg viewBox="0 0 19.2 19.2" fill="none" className="h-[19.2px] w-[19.2px]" aria-hidden="true">
      <path d="M9.60049 1.60058C14.0185 1.60084 17.6005 5.18246 17.6005 9.60058C17.6002 14.0184 14.0183 17.6003 9.60049 17.6006C5.1824 17.6006 1.6008 14.0186 1.60049 9.60058C1.60049 5.1823 5.18221 1.60058 9.60049 1.60058ZM9.59951 2.7998V6.40038C7.83246 6.40054 6.4005 7.83257 6.40029 9.5996C6.40029 11.3668 7.83233 12.7996 9.59951 12.7998V16.3994L9.60049 16.4004C13.3556 16.4001 16.4 13.3557 16.4003 9.60058C16.4003 5.84521 13.3558 2.80006 9.60049 2.7998H9.59951ZM9.59951 6.40038C11.3667 6.40038 12.7995 7.83247 12.7997 9.5996C12.7997 11.3669 11.3668 12.7998 9.59951 12.7998V6.40038Z" fill="currentColor" />
    </svg>
  );
}
