"use client";

import { useMemo } from "react";
import WorkImage from "./WorkImage";

type HeroItem = {
  id: string;
  title: string;
  thumbnail_url: string;
};

type MotionItem = HeroItem & {
  size: number;
  delay: number;
  duration: number;
  scale: number;
  track: "primary" | "secondary" | "tertiary";
};

export default function FloatingHeroGallery({ items }: { items: HeroItem[] }) {
  const motionItems = useMemo<MotionItem[]>(() => {
    const base = items.length > 0 ? items : [];
    const repeatedItems = Array.from({ length: 22 }, (_, index) => base[index % base.length]);
    const sizes = [58, 66, 74, 62, 80, 68];
    const tracks: MotionItem["track"][] = ["primary", "secondary", "tertiary"];

    return repeatedItems.map((item, index) => ({
      ...item,
      id: `${item.id}-${index}`,
      size: sizes[index % sizes.length],
      delay: index * -0.6,
      duration: 13.8 + (index % 3) * 0.7,
      scale: 0.98 + (index % 3) * 0.02,
      track: tracks[index % tracks.length],
    }));
  }, [items]);

  return (
    <div className="hero-flow-background" aria-hidden="true">
      {motionItems.map((item) => (
        <div
          key={item.id}
          className={`hero-flow-card hero-flow-card-${item.track}`}
          style={
            {
              "--hero-card-size": `${item.size}px`,
              "--hero-card-delay": `${item.delay}s`,
              "--hero-card-duration": `${item.duration}s`,
              "--hero-card-scale": item.scale,
            } as React.CSSProperties
          }
        >
          <WorkImage
            src={item.thumbnail_url}
            alt=""
            className="hero-flow-image"
          />
        </div>
      ))}
    </div>
  );
}
