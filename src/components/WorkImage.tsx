"use client";

import { useState } from "react";

const FALLBACK_SVG =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
      <rect width="100%" height="100%" fill="#f2f2f2"/>
      <rect x="24" y="24" width="752" height="552" fill="#ffffff" stroke="#e5e5e5"/>
      <text x="48" y="120" font-family="sans-serif" font-size="22" fill="#999">no image</text>
    </svg>`
  );

function proxyImageUrl(url: string) {
  if (url.startsWith("https://s.u-d-l.com/")) {
    const encoded = Array.from(url)
      .map((char) => char.charCodeAt(0).toString(16).padStart(2, "0"))
      .join("");
    return `/api/media?src=${encoded}`;
  }
  return url;
}

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
  const [videoFailed, setVideoFailed] = useState(false);
  const isPlaceholder = !!src && src.startsWith("data:image/svg+xml");
  const imageUrl = isPlaceholder && fallback ? fallback : src || fallback || FALLBACK_SVG;
  const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(imageUrl);
  const displayedImageUrl =
    isVideo && videoFailed
      ? fallback && !/\.(mp4|webm|mov)(\?|$)/i.test(fallback)
        ? fallback
        : FALLBACK_SVG
      : imageUrl;
  const renderedImageUrl = proxyImageUrl(displayedImageUrl);
  const renderedFallback =
    fallback && !fallback.startsWith("data:image/svg+xml")
      ? proxyImageUrl(fallback)
      : fallback;

  if (isVideo && !videoFailed) {
    return (
      <video
        src={imageUrl}
        className={className}
        aria-label={alt}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster={fallback && !/\.(mp4|webm|mov)(\?|$)/i.test(fallback) ? fallback : undefined}
        onError={() => setVideoFailed(true)}
      />
    );
  }

  return (
    <img
      src={renderedImageUrl}
      alt={alt}
      className={className}
      onError={(event) => {
        const img = event.currentTarget;
        const triedFallback = img.dataset.fallbackTried === "true";
        const nextSrc =
          renderedFallback && !triedFallback && !renderedFallback.startsWith("data:image/svg+xml")
            ? renderedFallback
            : FALLBACK_SVG;

        img.dataset.fallbackTried = "true";
        if (img.src !== nextSrc) {
          img.src = nextSrc;
        }
      }}
    />
  );
}
