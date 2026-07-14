"use client";

import { CSSProperties, useEffect, useRef } from "react";

const TWO_PI = Math.PI * 2;

type SpiralImage = { src: string };

type SpiralImagesProps = {
  images?: SpiralImage[];
  turns?: number;
  speed?: number;
  spacing?: number;
  spread?: number;
  sizeAttenuation?: number;
  imageSize?: number;
  fadeIn?: number;
  fadeOut?: number;
  cornerRadius?: number;
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean;
};

const DEFAULT_IMAGES: SpiralImage[] = [
  { src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/5f084e5a-2e3f-4239-be1a-5084a6dcef00/w=800" },
  { src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/3b42034b-897e-456d-cb00-1f2cf0aa4700/w=800" },
  { src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/c84f3e45-635f-4eaa-4e24-730098b55500/w=800" },
  { src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/9652cf81-4644-4471-1122-4e40ef6e2600/w=800" },
  { src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/1640f8fe-2cb1-4026-88e3-10dd0019f400/w=800" },
  { src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/20fd03c3-49d6-408c-3ac9-8c5a6ed2b500/w=800" },
];

/** Originkit Spiral Images, adapted for plain Next.js. */
export default function SpiralImages({
  images = DEFAULT_IMAGES,
  turns = 3.5,
  speed = 2,
  spacing = 5,
  spread = 6,
  sizeAttenuation = 2,
  imageSize = 200,
  fadeIn = 20,
  fadeOut = 0,
  cornerRadius = 5,
  className,
  style,
  "aria-hidden": ariaHidden,
}: SpiralImagesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const progressRef = useRef(0);
  const lastRef = useRef(0);
  const imgsRef = useRef<(HTMLImageElement | null)[]>([]);

  const items = images.length > 0 ? images : DEFAULT_IMAGES;
  const srcKey = items.map((image) => image.src).join("|");

  useEffect(() => {
    imgsRef.current = items.map((image) => {
      if (!image.src) return null;
      const element = new window.Image();
      element.crossOrigin = "anonymous";
      element.decoding = "async";
      element.src = image.src;
      return element;
    });
  }, [items]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let width = 0;
    let height = 0;

    const resize = () => {
      width = container.clientWidth || 600;
      height = container.clientHeight || 600;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    const spiral = (position: number, radius: number) => {
      const angle = position * turns * TWO_PI;
      const distance = radius * (1 - position);
      return {
        x: distance * Math.cos(angle),
        y: -distance * Math.sin(angle),
      };
    };

    // Equal arc-length lookup keeps the gap between cards visually uniform.
    const sampleCount = 2000;
    const cumulative = new Float32Array(sampleCount + 1);
    let previous = spiral(0, 1);
    for (let index = 1; index <= sampleCount; index += 1) {
      const point = spiral(index / sampleCount, 1);
      const dx = point.x - previous.x;
      const dy = point.y - previous.y;
      cumulative[index] = cumulative[index - 1] + Math.sqrt(dx * dx + dy * dy);
      previous = point;
    }

    const totalLength = cumulative[sampleCount] || 1;
    const lookupSize = 1024;
    const positionForArc = new Float32Array(lookupSize + 1);
    let sampleIndex = 0;
    for (let arcIndex = 0; arcIndex <= lookupSize; arcIndex += 1) {
      const target = (arcIndex / lookupSize) * totalLength;
      while (sampleIndex < sampleCount && cumulative[sampleIndex + 1] < target) {
        sampleIndex += 1;
      }
      const segment = cumulative[sampleIndex + 1] - cumulative[sampleIndex];
      const fraction = segment > 0 ? (target - cumulative[sampleIndex]) / segment : 0;
      positionForArc[arcIndex] = (sampleIndex + fraction) / sampleCount;
    }

    const arcToPosition = (arc: number) => {
      const value = Math.max(0, Math.min(lookupSize, arc * lookupSize));
      const index = Math.floor(value);
      const current = positionForArc[index];
      const next = positionForArc[Math.min(index + 1, lookupSize)];
      return current + (next - current) * (value - index);
    };

    const roundedRect = (
      x: number,
      y: number,
      rectWidth: number,
      rectHeight: number,
      radius: number,
    ) => {
      const corner = Math.min(radius, rectWidth / 2, rectHeight / 2);
      context.beginPath();
      context.moveTo(x + corner, y);
      context.arcTo(x + rectWidth, y, x + rectWidth, y + rectHeight, corner);
      context.arcTo(x + rectWidth, y + rectHeight, x, y + rectHeight, corner);
      context.arcTo(x, y + rectHeight, x, y, corner);
      context.arcTo(x, y, x + rectWidth, y, corner);
      context.closePath();
    };

    const draw = (now: number) => {
      const elapsed = lastRef.current ? (now - lastRef.current) / 1000 : 0;
      lastRef.current = now;
      progressRef.current =
        (progressRef.current + speed * Math.min(elapsed, 0.1)) % 100;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const radius =
        0.48 * Math.min(width, height) * (1 + (spread - 1) * 0.18);
      const loadedImages = imgsRef.current;
      const imageCount = loadedImages.length || 1;
      const step = Math.max(0.005, (spacing * 0.5) / 100);
      const slotCount = Math.min(400, Math.ceil(1 / step) + 2);
      const base = progressRef.current / 100;
      const cards: { path: number; position: number; image: number }[] = [];

      for (let index = 0; index < slotCount; index += 1) {
        const path = (((base + index * step) % 1) + 1) % 1;
        cards.push({
          path: path * 100,
          position: arcToPosition(path),
          image: index % imageCount,
        });
      }
      cards.sort((first, second) => first.position - second.position);

      for (const card of cards) {
        const point = spiral(card.position, radius);
        const distance = Math.sqrt(point.x * point.x + point.y * point.y);
        let opacity = 1;
        if (fadeIn > 0 && card.path < fadeIn) opacity = card.path / fadeIn;
        else if (fadeOut > 0 && card.path > 100 - fadeOut) {
          opacity = (100 - card.path) / fadeOut;
        }
        if (opacity < 0.01) continue;

        const scale =
          sizeAttenuation > 0
            ? Math.pow(Math.min(distance / radius, 1), sizeAttenuation * 0.5)
            : 1;
        const tangentPoint = spiral(Math.min(card.position + 0.001, 1), radius);
        const angle = Math.atan2(
          tangentPoint.y - point.y,
          tangentPoint.x - point.x,
        );
        const image = loadedImages[card.image];
        const ready = Boolean(image?.complete && image.naturalWidth > 0);
        const aspect = ready ? image!.naturalWidth / image!.naturalHeight : 1;
        let cardWidth = imageSize * scale;
        let cardHeight = cardWidth / aspect;
        if (aspect < 1) {
          cardHeight = imageSize * scale;
          cardWidth = cardHeight * aspect;
        }

        const radiusPixels =
          (cornerRadius / 20) * (Math.min(cardWidth, cardHeight) / 2);
        context.save();
        context.translate(centerX + point.x, centerY + point.y);
        context.rotate(angle);
        context.globalAlpha = opacity;
        roundedRect(
          -cardWidth / 2,
          -cardHeight / 2,
          cardWidth,
          cardHeight,
          radiusPixels,
        );
        context.clip();
        if (ready) {
          context.drawImage(
            image!,
            -cardWidth / 2,
            -cardHeight / 2,
            cardWidth,
            cardHeight,
          );
        } else {
          context.fillStyle = `hsl(${(card.image * 360) / imageCount} 28% 74%)`;
          context.fillRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight);
        }
        context.restore();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    lastRef.current = 0;
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      observer.disconnect();
    };
  }, [
    srcKey,
    turns,
    speed,
    spacing,
    spread,
    sizeAttenuation,
    imageSize,
    fadeIn,
    fadeOut,
    cornerRadius,
  ]);

  return (
    <div
      ref={containerRef}
      className={className}
      aria-hidden={ariaHidden}
      style={{
        ...style,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
