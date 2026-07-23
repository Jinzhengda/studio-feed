"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FloatingHeroGallery from "@/components/FloatingHeroGallery";
import InputField from "@/components/InputField";
import Button from "@/components/Button";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type LoginGalleryItem = {
  id: string;
  title: string;
  thumbnail_url: string;
};

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [galleryItems, setGalleryItems] = useState<LoginGalleryItem[]>([]);

  useEffect(() => {
    let active = true;

    fetch("/api/login-gallery")
      .then((response) => (response.ok ? response.json() : { images: [] }))
      .then((result) => {
        if (active && Array.isArray(result.images)) setGalleryItems(result.images);
      })
      .catch(() => {
        if (active) setGalleryItems([]);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    router.push("/");
  }

  return (
    <section className="login-page">
      <div className="login-form-panel">
        <div className="login-form-shell">
          <h1 className="login-title">welcome back</h1>
          <p className="login-description">
            登录后继续查看你的工作室作品流
          </p>

          <form
            onSubmit={handleLogin}
            className="login-form"
            autoComplete="off"
          >
            <InputField
              type="email"
              name="studio-feed-email"
              autoComplete="username"
              inputMode="email"
              enterKeyHint="next"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email"
              required
            />

            <InputField
              inputType="password"
              name="studio-feed-passcode"
              autoComplete="current-password"
              enterKeyHint="go"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              required
            />

            {errorMsg && (
              <p className="text-sm text-[var(--color-text-danger)]">{errorMsg}</p>
            )}

            <Button
              type="submit"
              loading={loading}
              fullWidth
              className="login-submit"
            >
              {loading ? "登录中" : "登录"}
            </Button>
          </form>
          <div className="login-secondary-action">
            <Link href="/forgot-password">
              忘记密码
            </Link>
          </div>
        </div>
      </div>

      <div className="login-visual-panel">
        {galleryItems.length > 0 && <FloatingHeroGallery items={galleryItems} />}
      </div>
    </section>
  );
}
