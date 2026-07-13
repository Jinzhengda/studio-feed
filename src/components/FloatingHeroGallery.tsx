"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import WorkImage from "./WorkImage";

type HeroItem = {
  id: string;
  title: string;
  thumbnail_url: string;
};

const MOVE_DURATION = 1200;
const PAUSE_DURATION = 2400;

const gallerySlots = [
  { offset: -1, position: "top" },
  { offset: 0, position: "center" },
  { offset: 1, position: "bottom" },
  { offset: 2, position: "next" },
] as const;

export default function FloatingHeroGallery({ items }: { items: HeroItem[] }) {
  const galleryRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    if (items.length < 2 || isMoving) return;

    const pauseTimer = window.setTimeout(() => {
      setIsMoving(true);
    }, PAUSE_DURATION);

    return () => window.clearTimeout(pauseTimer);
  }, [activeIndex, isMoving, items.length]);

  useEffect(() => {
    if (!isMoving) return;

    const moveTimer = window.setTimeout(() => {
      setIsMoving(false);
      setActiveIndex((current) => (current + 1) % items.length);
    }, MOVE_DURATION);

    return () => window.clearTimeout(moveTimer);
  }, [isMoving, items.length]);

  useLayoutEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery || isMoving || items.length < 2) return;

    const updateSpacing = () => {
      const top = gallery.querySelector<HTMLElement>(".login-gallery-card--top");
      const center = gallery.querySelector<HTMLElement>(".login-gallery-card--center");
      const bottom = gallery.querySelector<HTMLElement>(".login-gallery-card--bottom");
      const next = gallery.querySelector<HTMLElement>(".login-gallery-card--next");
      if (!top || !center || !bottom || !next) return;

      const topHeight = top.offsetHeight;
      const centerHeight = center.offsetHeight;
      const bottomHeight = bottom.offsetHeight;
      const nextHeight = next.offsetHeight;
      if (!topHeight || !centerHeight || !bottomHeight || !nextHeight) return;

      const smallScale = 0.38;
      const exitScale = 0.28;
      const itemGap = 80;

      const topY = -(centerHeight / 2 + topHeight * smallScale / 2 + itemGap);
      const bottomY = centerHeight / 2 + bottomHeight * smallScale / 2 + itemGap;
      const nextY =
        bottomY + bottomHeight * smallScale / 2 + nextHeight * smallScale / 2 + itemGap;

      const movingTopY =
        -(bottomHeight / 2 + centerHeight * smallScale / 2 + itemGap);
      const movingBottomY =
        bottomHeight / 2 + nextHeight * smallScale / 2 + itemGap;
      const exitY =
        movingTopY -
        (centerHeight * smallScale / 2 + topHeight * exitScale / 2 + itemGap);

      gallery.style.setProperty("--login-gallery-top-y", `${topY}px`);
      gallery.style.setProperty("--login-gallery-bottom-y", `${bottomY}px`);
      gallery.style.setProperty("--login-gallery-next-y", `${nextY}px`);
      gallery.style.setProperty("--login-gallery-exit-y", `${exitY}px`);
      gallery.style.setProperty("--login-gallery-moving-top-y", `${movingTopY}px`);
      gallery.style.setProperty("--login-gallery-moving-bottom-y", `${movingBottomY}px`);
    };

    updateSpacing();

    const cards = gallery.querySelectorAll<HTMLElement>(".login-gallery-card");
    const observer = new ResizeObserver(updateSpacing);
    cards.forEach((card) => observer.observe(card));
    window.addEventListener("resize", updateSpacing);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSpacing);
    };
  }, [activeIndex, isMoving, items.length]);

  if (items.length === 0) return null;

  const slots = items.length === 1
    ? [{ item: items[0], position: "center" as const }]
    : gallerySlots.map(({ offset, position }) => ({
        item: items[(activeIndex + offset + items.length) % items.length],
        position,
      }));

  return (
    <div
      ref={galleryRef}
      className={`login-gallery${isMoving ? " is-moving" : ""}`}
      aria-hidden="true"
    >
      {slots.map(({ item, position }) => (
        <figure
          key={item.id}
          className={`login-gallery-card login-gallery-card--${position}`}
          data-position={position}
        >
          <WorkImage
            src={item.thumbnail_url}
            alt=""
            className="login-gallery-image"
          />
        </figure>
      ))}
    </div>
  );
}
