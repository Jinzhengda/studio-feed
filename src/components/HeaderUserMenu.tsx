"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import MobileMenu from "./MobileMenu";

export default function HeaderUserMenu() {
  const supabase = createClient();
  const [isAuthed, setIsAuthed] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!isMounted) return;
        setIsAuthed(!!user);

        if (!user) {
          setAvatarUrl(null);
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", user.id)
          .single();

        if (!isMounted) return;
        setAvatarUrl(profile?.avatar_url || null);
        setLoading(false);
      } catch {
        if (!isMounted) return;
        setIsAuthed(false);
        setAvatarUrl(null);
        setLoading(false);
      }
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadUser();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (loading) {
    return <span className="h-10 w-10" aria-hidden="true" />;
  }

  if (!isAuthed) {
    return (
      <Link href="/login" className="text-sm">
        登录
      </Link>
    );
  }

  return (
    <>
      <div className="md:hidden">
        <MobileMenu
          isAuthed={true}
          avatarUrl={avatarUrl}
          showNavLinks={true}
          showThemeToggle={true}
        />
      </div>
      <div className="hidden md:block">
        <MobileMenu
          isAuthed={true}
          avatarUrl={avatarUrl}
          showNavLinks={true}
          showThemeToggle={true}
        />
      </div>
    </>
  );
}
