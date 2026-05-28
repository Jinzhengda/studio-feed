"use client";

import { useState } from "react";
import Image from "next/image";

export default function AvatarImage({
  src,
  alt,
  size,
  className = "",
}: {
  src?: string | null;
  alt: string;
  size: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-[var(--hover)] font-medium text-[var(--muted)] ${className}`}
      >
        U
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      unoptimized
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
