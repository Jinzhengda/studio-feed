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
  const isPlaceholder =
    !!src && src.startsWith("data:image/svg+xml");
  const initial = isPlaceholder && fallback ? fallback : src || fallback || FALLBACK_SVG;
  const [current, setCurrent] = useState(initial);

  useEffect(() => {
    const nextIsPlaceholder = !!src && src.startsWith("data:image/svg+xml");
    setCurrent(
      nextIsPlaceholder && fallback ? fallback : src || fallback || FALLBACK_SVG
    );
  }, [src, fallback]);

  return (
    <img
      src={current}
      alt={alt}
      className={className}
      onError={() => {
        if (current !== (fallback || FALLBACK_SVG)) {
          setCurrent(fallback || FALLBACK_SVG);
        }
      }}
    />
  );
}
