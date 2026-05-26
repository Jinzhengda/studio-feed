"use client";

import { useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  function toggleTheme() {
    const current = document.documentElement.classList.contains("dark");
    const next = !current;

    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("studio-feed-theme", next ? "dark" : "light");
    setIsDark(next);
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={isDark ? "切换到亮色模式" : "切换到暗色模式"}
      aria-pressed={isDark}
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
