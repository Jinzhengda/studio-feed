"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function MobileFeedSearch() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [isAuthed, setIsAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) return;
      setIsAuthed(!!user);
      setLoading(false);
    }

    void loadUser();

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

  if (pathname !== "/" || loading || !isAuthed) {
    return null;
  }

  function updateQuery(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("q", value);
    } else {
      params.delete("q");
    }
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  }

  return (
    <div className="order-3 mt-3 w-full md:order-none md:mt-0 md:w-[240px]">
      <input
        className="h-9 w-full rounded-none border border-[var(--stroke)] bg-[var(--card)] px-3 text-sm outline-none transition-colors focus:border-black focus:ring-0 dark:focus:border-white"
        value={searchParams.get("q") || ""}
        onChange={(event) => updateQuery(event.target.value)}
        placeholder="搜索作品或工作室"
      />
    </div>
  );
}
