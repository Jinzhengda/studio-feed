"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import InputField from "@/components/InputField";

export default function MobileFeedSearch() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setIsAuthed(Boolean(data.user));
    });
    return () => {
      mounted = false;
    };
  }, [supabase]);

  if (pathname !== "/") {
    return null;
  }
  if (isAuthed !== true) return null;

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
    <div className="site-header-search order-3 mt-3 w-full md:order-none md:mt-0 md:w-[240px]">
      <InputField
        inputType="search"
        aria-label="搜索作品或工作室"
        value={searchParams.get("q") || ""}
        onChange={(event) => updateQuery(event.target.value)}
        placeholder="搜索作品或工作室"
      />
    </div>
  );
}
