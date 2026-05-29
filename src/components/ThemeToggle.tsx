"use client";

import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark" | "system";
const THEME_STORAGE_KEY = "studio-feed-theme-mode";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return "system";
    }

    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === "light" || savedTheme === "dark" || savedTheme === "system") {
      return savedTheme;
    }

    return "system";
  });

  useEffect(() => {
    applyTheme(theme);

    if (theme !== "system") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = () => applyTheme("system");

    mediaQuery.addEventListener("change", syncSystemTheme);

    return () => {
      mediaQuery.removeEventListener("change", syncSystemTheme);
    };
  }, [theme]);

  function toggleTheme() {
    const nextTheme =
      theme === "system" ? "dark" : theme === "dark" ? "light" : "system";

    applyTheme(nextTheme);
    setTheme(nextTheme);
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label="切换主题"
      aria-pressed={theme === "dark"}
      suppressHydrationWarning
      onClick={toggleTheme}
    >
      <span
        className="theme-toggle-track"
        aria-hidden="true"
      >
        <span className="theme-toggle-segment theme-toggle-segment-moon">
          <MoonIcon />
        </span>
        <span className="theme-toggle-segment theme-toggle-segment-sun">
          <SunIcon />
        </span>
      </span>
    </button>
  );
}

export function applyTheme(nextTheme: ThemeMode) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const useDark = nextTheme === "dark" || (nextTheme === "system" && prefersDark);

  document.documentElement.classList.toggle("light", nextTheme === "light");
  document.documentElement.classList.toggle("dark", useDark);
  window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className="theme-toggle-svg"
      aria-hidden="true"
    >
      <path
        d="M15.7 12.7A7 7 0 0 1 7.3 4.3 6.8 6.8 0 1 0 15.7 12.7Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className="theme-toggle-svg"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="3.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4M15.3 15.3l-1.4-1.4M6.1 6.1 4.7 4.7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ThemeSunIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="3.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4M15.3 15.3l-1.4-1.4M6.1 6.1 4.7 4.7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ThemeMoonIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M15.7 12.7A7 7 0 0 1 7.3 4.3 6.8 6.8 0 1 0 15.7 12.7Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ThemeSystemIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="5.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 4.5a5.5 5.5 0 0 1 0 11Z" fill="currentColor" />
    </svg>
  );
}
