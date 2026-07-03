"use client";

import Link from "next/link";
import { useState } from "react";
import InputField from "@/components/InputField";
import Button from "@/components/Button";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const origin = window.location.origin;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${origin}/auth/callback?next=/welcome` },
    });
    setLoading(false);
    setMessage(error ? error.message : "验证邮件已发送，请打开邮件完成注册。");
  }

  return (
    <AuthCard title="创建账号" description="注册后建立属于你自己的工作室作品流。">
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput label="邮箱" type="email" value={email} onChange={setEmail} />
        <AuthInput label="密码（至少 8 位）" type="password" value={password} onChange={setPassword} minLength={8} />
        {message && <p className="text-sm text-[var(--muted)]">{message}</p>}
        <Button type="submit" loading={loading} fullWidth>
          {loading ? "注册中" : "注册"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-[var(--muted)]">
        已有账号？ <Link href="/login" className="text-[var(--ink)] underline">登录</Link>
      </p>
    </AuthCard>
  );
}

function AuthCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-[360px]">
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{description}</p>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

function AuthInput({ label, type, value, onChange, minLength }: {
  label: string; type: string; value: string; onChange: (value: string) => void; minLength?: number;
}) {
  return (
    <InputField
      label={label}
      inputType={type === "password" ? "password" : "text"}
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      minLength={minLength}
      required
    />
  );
}
