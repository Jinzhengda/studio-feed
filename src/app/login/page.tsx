"use client";

import { useEffect, useRef, useState } from "react";
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
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailEditable, setEmailEditable] = useState(false);
  const [passwordEditable, setPasswordEditable] = useState(false);
  const [galleryItems, setGalleryItems] = useState<LoginGalleryItem[]>([]);

  useEffect(() => {
    function clearAutofill() {
      if (emailRef.current) emailRef.current.value = "";
      if (passwordRef.current) passwordRef.current.value = "";
    }

    clearAutofill();
    const timer = window.setTimeout(clearAutofill, 100);

    return () => window.clearTimeout(timer);
  }, []);

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
              ref={emailRef}
              type="email"
              name="studio-feed-email"
              autoComplete="off"
              readOnly={!emailEditable}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setEmailEditable(true)}
              placeholder="email"
              required
            />

            <InputField
              ref={passwordRef}
              inputType="password"
              name="studio-feed-passcode"
              autoComplete="new-password"
              readOnly={!passwordEditable}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPasswordEditable(true)}
              placeholder="password"
              required
            />

            {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

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
