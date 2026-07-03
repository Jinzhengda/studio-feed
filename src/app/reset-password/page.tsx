"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import InputField from "@/components/InputField";
import Button from "@/components/Button";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return setMessage(error.message);
    router.replace("/");
  }

  return (
    <section className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-[360px]">
        <h1 className="text-3xl font-semibold">设置新密码</h1>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <InputField
            label="新密码"
            inputType="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="请输入至少 8 位密码"
            minLength={8}
            required
            error={message || undefined}
          />
          <Button type="submit" loading={loading} fullWidth>
            {loading ? "保存中" : "保存新密码"}
          </Button>
        </form>
      </div>
    </section>
  );
}
