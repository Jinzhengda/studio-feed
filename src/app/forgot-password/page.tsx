"use client";

import Link from "next/link";
import { useState } from "react";
import InputField from "@/components/InputField";
import Button from "@/components/Button";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    setMessage(error ? error.message : "如果该邮箱已注册，密码重置邮件将发送到你的邮箱。");
  }

  return (
    <section className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-[360px]">
        <h1 className="text-3xl font-semibold">找回密码</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">输入注册邮箱，我们会发送重置链接。</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <InputField
            label="邮箱"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="请输入邮箱地址"
            required
          />
          {message && <p className="text-sm text-[var(--muted)]">{message}</p>}
          <Button type="submit" loading={loading} fullWidth>
            {loading ? "发送中" : "发送重置邮件"}
          </Button>
        </form>
        <Link href="/login" className="mt-6 inline-block text-sm underline">返回登录</Link>
      </div>
    </section>
  );
}
