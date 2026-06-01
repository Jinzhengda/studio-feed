"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FloatingHeroGallery from "@/components/FloatingHeroGallery";
import { createClient } from "@/lib/supabase/client";

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
  const [showPassword, setShowPassword] = useState(false);
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
      <div className="flex min-h-[520px] items-center justify-center px-10 py-12">
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
            <div>
              <label className="text-sm">邮箱</label>
              <input
                ref={emailRef}
                type="email"
                name="studio-feed-email"
                autoComplete="off"
                readOnly={!emailEditable}
                className="mt-2 h-10 w-full rounded-none border border-[var(--stroke)] px-4 outline-none transition-colors focus:border-black focus:ring-1 focus:ring-black dark:focus:border-white dark:focus:ring-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setEmailEditable(true)}
                placeholder="请输入邮箱地址"
                required
              />
            </div>

            <div>
              <label className="text-sm">密码</label>
              <div className="relative mt-2">
                <input
                  ref={passwordRef}
                  type={showPassword ? "text" : "password"}
                  name="studio-feed-passcode"
                  autoComplete="new-password"
                  readOnly={!passwordEditable}
                  className="h-10 w-full rounded-none border border-[var(--stroke)] px-4 pr-11 outline-none transition-colors focus:border-black focus:ring-1 focus:ring-black dark:focus:border-white dark:focus:ring-white"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordEditable(true)}
                  placeholder=""
                  required
                />
                {password && (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "隐藏密码" : "显示密码"}
                  >
                    {showPassword ? (
                      <svg
                        aria-hidden="true"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                        viewBox="0 0 24 24"
                      >
                        <path d="m3 3 18 18" />
                        <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
                        <path d="M9.88 4.24A9.85 9.85 0 0 1 12 4c5 0 9 5 9 8a8.2 8.2 0 0 1-1.65 3.92" />
                        <path d="M6.61 6.61C4.42 8.1 3 10.25 3 12c0 3 4 8 9 8 1.37 0 2.66-.38 3.82-1.01" />
                      </svg>
                    ) : (
                      <svg
                        aria-hidden="true"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                        viewBox="0 0 24 24"
                      >
                        <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.1 8.85 7.05 4 12 4s8.9 4.85 9.94 7.65a1 1 0 0 1 0 .7C20.9 15.15 16.95 20 12 20s-8.9-4.85-9.94-7.65Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>

            {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary mt-8 h-10 w-full rounded-none"
            >
              {loading ? "登录中..." : "登录"}
            </button>
          </form>
        </div>
      </div>

      <div className="login-visual-panel relative hidden min-h-screen overflow-hidden lg:block">
        <FloatingHeroGallery items={loginGalleryItems} />
        <div className="login-visual-vignette" aria-hidden="true" />
      </div>
    </section>
  );
}
