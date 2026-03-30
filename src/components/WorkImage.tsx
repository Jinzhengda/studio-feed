"use client";

import { useEffect, useState } from "react";

const FALLBACK_SVG =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
      <rect width="100%" height="100%" fill="#f2f2f2"/>
      <rect x="24" y="24" width="752" height="552" fill="#ffffff" stroke="#e5e5e5"/>
      <text x="48" y="120" font-family="sans-serif" font-size="22" fill="#999">no image</text>
    </svg>`
  );

export default function WorkImage({
  src,
  fallback,
  alt,
  className,
}: {
  src?: string | null;
  fallback?: string | null;
  alt: string;
  className?: string;
}) {
  const [current, setCurrent] = useState<string>(FALLBACK_SVG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    const isPlaceholder = !!src && src.startsWith("data:image/svg+xml");
    const imageUrl = isPlaceholder && fallback ? fallback : src || fallback || FALLBACK_SVG;

    if (!imageUrl || imageUrl === FALLBACK_SVG || imageUrl.startsWith("data:image/svg+xml")) {
      setCurrent(imageUrl);
      setLoading(false);
      return;
    }

    // 添加超时机制，避免无限加载
    const timeout = setTimeout(() => {
      setCurrent(fallback || FALLBACK_SVG);
      setLoading(false);
    }, 10000); // 10秒超时

    const img = new Image();
    img.onload = () => {
      clearTimeout(timeout);
      setCurrent(imageUrl);
      setLoading(false);
    };
    img.onerror = () => {
      clearTimeout(timeout);
      if (fallback && imageUrl !== fallback && !fallback.startsWith("data:image/svg+xml")) {
        const fallbackImg = new Image();
        const fallbackTimeout = setTimeout(() => {
          setCurrent(FALLBACK_SVG);
          setLoading(false);
        }, 5000);

        fallbackImg.onload = () => {
          clearTimeout(fallbackTimeout);
          setCurrent(fallback);
          setLoading(false);
        };
        fallbackImg.onerror = () => {
          clearTimeout(fallbackTimeout);
          setCurrent(FALLBACK_SVG);
          setLoading(false);
        };
        fallbackImg.src = fallback;
      } else {
        setCurrent(FALLBACK_SVG);
        setLoading(false);
      }
    };
    img.src = imageUrl;

    return () => {
      clearTimeout(timeout);
    };
  }, [src, fallback]);

  return (
    <img
      src={current}
      alt={alt}
      className={className}
      style={{ opacity: loading ? 0.5 : 1, transition: "opacity 0.3s" }}
    />
  );
}
