"use client";

import { useEffect, useRef, useState } from "react";

const FALLBACK_SVG =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
      <rect width="100%" height="100%" fill="#f2f2f2"/>
      <rect x="24" y="24" width="752" height="552" fill="#ffffff" stroke="#e5e5e5"/>
      <text x="48" y="120" font-family="sans-serif" font-size="22" fill="#999">no image</text>
    </svg>`
  );

const PROXIED_IMAGE_HOSTS = new Set([
  "s.u-d-l.com",
  "www.weareink.co.uk",
  "pentagram-production.imgix.net",
  "pentagram-production-uploads.s3.amazonaws.com",
  "basedesign2.imgix.net",
  "cdn.sanity.io",
]);

function proxyImageUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (!PROXIED_IMAGE_HOSTS.has(parsed.hostname)) return url;

    const encoded = Array.from(url)
      .map((char) => char.charCodeAt(0).toString(16).padStart(2, "0"))
      .join("");
    return `/api/media?src=${encoded}`;
  } catch {
    return url;
  }
}

type HoverPalette = {
  background: string;
  foreground: string;
};

function getHoverPalette(image: HTMLImageElement | HTMLVideoElement): HoverPalette | null {
  try {
    const canvas = document.createElement("canvas");
    const size = 32;
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;

    const sourceWidth =
      image instanceof HTMLImageElement ? image.naturalWidth : image.videoWidth;
    const sourceHeight =
      image instanceof HTMLImageElement ? image.naturalHeight : image.videoHeight;
    if (!sourceWidth || !sourceHeight) return null;

    context.drawImage(image, 0, 0, size, size);
    const pixels = context.getImageData(0, 0, size, size).data;
    const buckets = new Map<
      string,
      { score: number; samples: number; red: number; green: number; blue: number }
    >();

    for (let index = 0; index < pixels.length; index += 4) {
      const alpha = pixels[index + 3];
      if (alpha < 180) continue;

      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      const lightness = (red + green + blue) / 3;
      const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);

      // 避开接近纯白的留白，优先选择真正构成画面的色彩。
      if (lightness > 242 || (lightness > 220 && saturation < 18)) continue;

      const key = `${Math.round(red / 32)}-${Math.round(green / 32)}-${Math.round(blue / 32)}`;
      const bucket = buckets.get(key) || {
        score: 0,
        samples: 0,
        red: 0,
        green: 0,
        blue: 0,
      };
      bucket.score += 1 + saturation / 255;
      bucket.samples += 1;
      bucket.red += red;
      bucket.green += green;
      bucket.blue += blue;
      buckets.set(key, bucket);
    }

    const dominant = [...buckets.values()].sort((a, b) => b.score - a.score)[0];
    if (!dominant || dominant.samples < 1) return null;

    const sampleCount = dominant.samples;
    const red = Math.round(dominant.red / sampleCount);
    const green = Math.round(dominant.green / sampleCount);
    const blue = Math.round(dominant.blue / sampleCount);
    const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;

    return {
      background: `${red} ${green} ${blue}`,
      foreground: luminance > 0.58 ? "#171717" : "#ffffff",
    };
  } catch {
    // 某些外部图源不允许读取像素；此时保留默认遮罩，不影响卡片展示。
    return null;
  }
}

function applyHoverPalette(image: HTMLImageElement | HTMLVideoElement) {
  const card = image.closest<HTMLElement>(".work-card");
  const palette = getHoverPalette(image);
  if (!card || !palette) return;

  card.style.setProperty("--work-card-hover-color", palette.background);
  card.style.setProperty("--work-card-hover-foreground", palette.foreground);

  // 内联到蒙层，避免旧版浏览器在 CSS 自定义属性嵌套的 rgba 写法上回退为固定黑色。
  const overlay = card.querySelector<HTMLElement>(".work-card-overlay");
  if (!overlay) return;

  overlay.style.background = `rgb(${palette.background})`;
  overlay.style.color = palette.foreground;

  const meta = overlay.querySelector<HTMLElement>(".work-card-overlay-meta");
  if (meta) {
    meta.style.color =
      palette.foreground === "#171717" ? "rgb(23 23 23 / 0.64)" : "rgb(255 255 255 / 0.68)";
  }
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
  const imageRef = useRef<HTMLImageElement>(null);
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

  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth > 0) {
      applyHoverPalette(image);
    }
  }, [renderedImageUrl]);

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
        onLoadedData={(event) => applyHoverPalette(event.currentTarget)}
        onError={() => setVideoFailed(true)}
      />
    );
  }

  return (
    // Runtime media fallbacks rely on directly swapping the element src after load errors.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imageRef}
      src={renderedImageUrl}
      alt={alt}
      className={className}
      onLoad={(event) => applyHoverPalette(event.currentTarget)}
      onError={(event) => {
        const img = event.currentTarget;
        const triedDirectSource = img.dataset.directSourceTried === "true";
        const triedFallback = img.dataset.fallbackTried === "true";

        // Some CDN URLs reject server-side proxy requests while still loading
        // normally in the browser. Retry the original source once before
        // falling back to the studio cover or placeholder.
        if (!triedDirectSource && renderedImageUrl !== imageUrl) {
          img.dataset.directSourceTried = "true";
          img.src = imageUrl;
          return;
        }

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
