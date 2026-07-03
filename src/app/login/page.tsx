"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FloatingHeroGallery from "@/components/FloatingHeroGallery";
import InputField from "@/components/InputField";
import Button from "@/components/Button";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const loginGalleryItems = Array.from({ length: 12 }, (_, index) => ({
  id: `login-gallery-${index}`,
  title: `Studio reference ${index + 1}`,
  thumbnail_url: `https://picsum.photos/seed/studio-feed-login-${index}/720/720`,
}));

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

  useEffect(() => {
    function clearAutofill() {
      if (emailRef.current) emailRef.current.value = "";
      if (passwordRef.current) passwordRef.current.value = "";
    }

    clearAutofill();
    const timer = window.setTimeout(clearAutofill, 100);

    return () => window.clearTimeout(timer);
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
    <section className="grid min-h-screen lg:grid-cols-2">
      <div className="flex min-h-[520px] items-center justify-center px-6 py-6 sm:px-7 sm:py-7 lg:px-8 lg:py-8">
        <div className="w-full max-w-[320px]">
          <h1 className="text-3xl font-semibold">欢迎回来</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            登录后继续查看你的工作室作品流。
          </p>

          <form
            onSubmit={handleLogin}
            className="mt-8 space-y-4"
            autoComplete="off"
          >
            <InputField
              ref={emailRef}
              label="邮箱"
              type="email"
              name="studio-feed-email"
              autoComplete="off"
              readOnly={!emailEditable}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setEmailEditable(true)}
              placeholder="请输入邮箱地址"
              required
            />

            <InputField
              ref={passwordRef}
              label="密码"
              inputType="password"
              name="studio-feed-passcode"
              autoComplete="new-password"
              readOnly={!passwordEditable}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPasswordEditable(true)}
              placeholder="请输入密码"
              required
            />

            {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

            <Button
              type="submit"
              loading={loading}
              fullWidth
              className="mt-8"
            >
              {loading ? "登录中" : "登录"}
            </Button>
          </form>
          <div className="mt-6 flex justify-between text-sm">
            <Link href="/forgot-password" className="text-[var(--muted)] underline">
              忘记密码
            </Link>
            <Link href="/signup" className="underline">
              创建账号
            </Link>
          </div>
        </div>
      </div>

      <div className="login-visual-panel relative hidden min-h-screen overflow-hidden lg:block">
        <FloatingHeroGallery items={loginGalleryItems} />
        <div className="login-visual-vignette" aria-hidden="true" />
      </div>
    </section>
  );
}
