import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 40;

type WorkRow = {
  id: string;
  title: string | null;
  thumbnail_url: string | null;
  work_url: string | null;
  published_at: string | null;
  created_at: string | null;
  first_seen_at: string | null;
  studios:
    | { name: string | null; cover_url: string | null }
    | { name: string | null; cover_url: string | null }[]
    | null;
};

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const page = Math.max(Number(url.searchParams.get("page") || 0), 0);
  const pageSize = Math.min(
    Math.max(Number(url.searchParams.get("limit") || DEFAULT_PAGE_SIZE), 1),
    MAX_PAGE_SIZE
  );
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabase
    .from("works")
    .select(
      "id,title,thumbnail_url,work_url,published_at,created_at,first_seen_at, studios(name, cover_url)"
    )
    .eq("is_visible", true)
    .gte("first_seen_at", sixMonthsAgo.toISOString())
    .order("first_seen_at", { ascending: false })
    .range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const works =
    (data as WorkRow[] | null)
      ?.map((work) => {
        const studio = Array.isArray(work.studios) ? work.studios[0] : work.studios;

        return {
          id: work.id,
          title: work.title || "Untitled",
          studio: studio?.name || "Unknown Studio",
          thumbnail_url: work.thumbnail_url || "",
          studio_cover_url: studio?.cover_url || "",
          work_url: work.work_url || "#",
          published_at: work.published_at || new Date().toISOString(),
          created_at: work.created_at || new Date().toISOString(),
          first_seen_at: work.first_seen_at || new Date().toISOString(),
        };
      })
      .filter((work) => work.studio !== "立入禁止") || [];

  return NextResponse.json({
    works,
    nextPage: page + 1,
    hasMore: (data?.length || 0) === pageSize,
  });
}
