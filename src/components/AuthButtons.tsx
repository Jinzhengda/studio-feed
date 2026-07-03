"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Button, { ButtonLink } from "@/components/Button";

export default function AuthButtons({ isAuthed }: { isAuthed: boolean }) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!isAuthed) {
    return (
      <ButtonLink href="/login" variant="secondary">
        登录
      </ButtonLink>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <ButtonLink href="/admin/studios" variant="secondary">
        Admin
      </ButtonLink>
      <Button
        onClick={handleLogout}
        variant="danger"
      >
        登出
      </Button>
    </div>
  );
}
