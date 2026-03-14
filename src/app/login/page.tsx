"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

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

    router.push("/admin/studios");
  }

  return (
    <section className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-3xl font-semibold">登录</h1>

      <form onSubmit={handleLogin} className="mt-6 space-y-4">
        <div>
          <label className="text-sm">邮箱</label>
          <input
            type="email"
            className="mt-2 w-full rounded-lg border border-[var(--stroke)] px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>

        <div>
          <label className="text-sm">密码</label>
          <input
            type="password"
            className="mt-2 w-full rounded-lg border border-[var(--stroke)] px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg border border-black px-4 py-2 text-sm"
        >
          {loading ? "登录中..." : "登录"}
        </button>
      </form>
    </section>
  );
}
