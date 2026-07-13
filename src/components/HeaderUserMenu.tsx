"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import MobileMenu from "./MobileMenu";
import { HeaderMenuIcon } from "./MobileMenu";

export default function HeaderUserMenu() {
  const supabase = createClient();
  const pathname = usePathname();
  const isAdminPath = pathname.startsWith("/admin");
  const [isAuthed, setIsAuthed] = useState(isAdminPath);
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
        if (profile?.avatar_url?.startsWith("http")) {
          setAvatarUrl(profile.avatar_url);
        } else if (profile?.avatar_url) {
          const { data } = await supabase.storage
            .from("public2")
            .createSignedUrl(profile.avatar_url, 3600);
          setAvatarUrl(data?.signedUrl || null);
        } else {
          setAvatarUrl(null);
        }
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
    if (pathname === "/") {
      return <Link href="/login" className="site-header-login-link">登录</Link>;
    }
    return isAdminPath ? (
      <MobileMenu
        isAuthed={true}
        avatarUrl={avatarUrl}
        showNavLinks={true}
        showThemeToggle={true}
      />
    ) : (
      <span className="site-header-menu-fallback" aria-hidden="true">
        <HeaderMenuIcon />
      </span>
    );
  }

  if (!isAuthed) {
    if (pathname === "/") {
      return <Link href="/login" className="site-header-login-link">登录</Link>;
    }
    return (
      <MobileMenu
        isAuthed={false}
        avatarUrl={null}
        showNavLinks={true}
        showThemeToggle={true}
      />
    );
  }

  return (
    <MobileMenu
      isAuthed={true}
      avatarUrl={avatarUrl}
      showNavLinks={true}
      showThemeToggle={true}
    />
  );
}
