import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  extractDateFromMediaVersion,
  shouldDisplayWork,
  shouldPreferCaptureDate,
} from "@/lib/work-rules";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 40;
const CANDIDATE_MULTIPLIER = 10;
const MIN_CANDIDATE_LIMIT = 300;
const SUPPLEMENTAL_WORK_URL_PATTERN = "%weareink.co.uk%";

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
  const sliceFrom = page * pageSize;
  const sliceTo = sliceFrom + pageSize;
  const candidateLimit = Math.max(
    sliceTo * CANDIDATE_MULTIPLIER,
    MIN_CANDIDATE_LIMIT
  );
  const selectColumns =
    "id,title,thumbnail_url,work_url,published_at,created_at,first_seen_at, studios(name, cover_url)";

  const [
    { data: publishedData, error: publishedError },
    { data: recentData, error: recentError },
    { data: supplementalData, error: supplementalError },
  ] =
    await Promise.all([
      supabase
        .from("works")
        .select(selectColumns)
        .eq("is_visible", true)
        .not("thumbnail_url", "is", null)
        .gte("first_seen_at", sixMonthsAgo.toISOString())
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("first_seen_at", { ascending: false })
        .range(0, candidateLimit - 1),
      supabase
        .from("works")
        .select(selectColumns)
        .eq("is_visible", true)
        .not("thumbnail_url", "is", null)
        .gte("first_seen_at", sixMonthsAgo.toISOString())
        .order("first_seen_at", { ascending: false })
        .range(0, candidateLimit - 1),
      supabase
        .from("works")
        .select(selectColumns)
        .eq("is_visible", true)
        .not("thumbnail_url", "is", null)
        .ilike("work_url", SUPPLEMENTAL_WORK_URL_PATTERN)
        .order("first_seen_at", { ascending: false })
        .limit(60),
    ]);

  const error = publishedError || recentError || supplementalError;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const seen = new Set<string>();
  const works = [
    ...(((publishedData as WorkRow[] | null) || [])),
    ...(((recentData as WorkRow[] | null) || [])),
    ...(((supplementalData as WorkRow[] | null) || [])),
  ]
    .filter((work) => shouldDisplayWork(work))
    .map((work) => {
        const studio = Array.isArray(work.studios) ? work.studios[0] : work.studios;
        const effectiveDate =
          shouldPreferCaptureDate(work.work_url)
            ? work.created_at ||
              work.first_seen_at ||
              work.published_at ||
              new Date().toISOString()
            : work.published_at ||
              work.first_seen_at ||
              extractDateFromMediaVersion(work.thumbnail_url) ||
              work.created_at ||
              new Date().toISOString();

        return {
          id: work.id,
          title: work.title || "Untitled",
          studio: studio?.name || "Unknown Studio",
          thumbnail_url: work.thumbnail_url || "",
          studio_cover_url: studio?.cover_url || "",
          work_url: work.work_url || "#",
          published_at: effectiveDate,
          created_at: work.created_at || new Date().toISOString(),
          first_seen_at: work.first_seen_at || effectiveDate,
        };
      })
    .filter((work) => work.studio !== "立入禁止")
    .filter((work) => {
      const key = work.work_url || work.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    );
  const pageWorks = works.slice(sliceFrom, sliceTo);

  return NextResponse.json({
    works: pageWorks,
    nextPage: page + 1,
    hasMore: works.length > sliceTo,
  });
}
