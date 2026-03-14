"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthButtons({ isAuthed }: { isAuthed: boolean }) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!isAuthed) {
    return (
      <Link
        href="/login"
        className="rounded-full border border-black px-4 py-2 text-sm"
      >
        登录
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/admin/studios"
        className="rounded-full border border-black px-4 py-2 text-sm"
      >
        Admin
      </Link>
      <button
        onClick={handleLogout}
        className="rounded-full border border-black px-4 py-2 text-sm"
      >
        登出
      </button>
    </div>
  );
}
