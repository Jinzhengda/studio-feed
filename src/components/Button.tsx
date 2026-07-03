"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type SharedProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
};

export function buttonClassName({
  variant = "primary",
  loading = false,
  fullWidth = false,
  className = "",
}: Omit<SharedProps, "children"> = {}) {
  return [
    "sf-button",
    `sf-button--${variant}`,
    loading ? "sf-button--loading" : "",
    fullWidth ? "sf-button--full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export default function Button({
  children,
  variant = "primary",
  loading = false,
  fullWidth = false,
  className,
  disabled,
  type = "button",
  ...props
}: SharedProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={buttonClassName({ variant, loading, fullWidth, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <LoaderCircle className="sf-button__loader" aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}

export function ButtonLink({
  children,
  variant = "primary",
  fullWidth = false,
  className,
  ...props
}: SharedProps & ComponentProps<typeof Link>) {
  return (
    <Link
      className={buttonClassName({ variant, fullWidth, className })}
      {...props}
    >
      <span>{children}</span>
    </Link>
  );
}
