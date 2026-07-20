"use client";

import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import InputField from "@/components/InputField";
import {
  getSearchQuery,
  getServerSearchQuery,
  setSearchQuery,
  subscribeSearchQuery,
  syncSearchQueryToUrl,
} from "@/lib/search-query";

export default function MobileFeedSearch() {
  const pathname = usePathname();
  const query = useSyncExternalStore(
    subscribeSearchQuery,
    getSearchQuery,
    getServerSearchQuery,
  );
  const [draftQuery, setDraftQuery] = useState(query);
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

  useEffect(() => {
    setDraftQuery(query);
  }, [query]);

  useEffect(() => {
    if (draftQuery === query) return;

    const timer = window.setTimeout(() => {
      setSearchQuery(draftQuery);
    }, 120);

    return () => window.clearTimeout(timer);
  }, [draftQuery, query]);

  function commitQuery() {
    setSearchQuery(draftQuery);
    syncSearchQueryToUrl(draftQuery);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    commitQuery();
    event.currentTarget.blur();
  }

  if (pathname !== "/") {
    return null;
  }
  if (isAuthed !== true) return null;

  return (
    <div className="site-header-search order-3 mt-3 w-full md:order-none md:mt-0 md:w-[240px]">
      <InputField
        inputType="search"
        aria-label="搜索作品或工作室"
        value={draftQuery}
        onChange={(event) => setDraftQuery(event.target.value)}
        onBlur={commitQuery}
        onKeyDown={handleKeyDown}
        placeholder="搜索作品或工作室"
      />
    </div>
  );
}
