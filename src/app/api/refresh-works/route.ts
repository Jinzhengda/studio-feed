import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { load } from "cheerio";

type ScrapedWork = {
  title: string;
  workUrl: string;
  thumbnailUrl: string;
  publishedAt?: string | null;
};

const IGNORE_TITLES = new Set([
  "show all projects",
  "load more",
  "all",
  "projects",
  "project",
  "work",
  "works",
]);

function normalizeUrl(input: string) {
  try {
    const url = new URL(input);
    const host = url.host.toLowerCase();
    let path = url.pathname.replace(/\/+$/, "");
    if (path === "") path = "/";
    url.search = "";
    url.hash = "";
    return `${url.protocol}//${host}${path}`;
  } catch {
    return input.trim().replace(/\/+$/, "");
  }
}

function toAbsolute(base: string, href: string) {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

function placeholderImage(seed: string) {
  const sizes: Array<[number, number]> = [
    [800, 520],
    [800, 1000],
    [800, 640],
    [800, 900],
    [800, 480],
    [800, 1100],
  ];
  const [w, h] = sizes[Math.abs(seed.length) % sizes.length];
  const label = seed
    .replace(/^https?:\/\//, "")
    .replace(/[&<>]/g, "")
    .slice(0, 24);
  const svg = `<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"${w}\" height=\"${h}\" viewBox=\"0 0 ${w} ${h}\">\n  <rect width=\"100%\" height=\"100%\" fill=\"#f2f2f2\" />\n  <rect x=\"24\" y=\"24\" width=\"${w - 48}\" height=\"${h - 48}\" fill=\"#ffffff\" stroke=\"#e5e5e5\" />\n  <text x=\"48\" y=\"${Math.min(h - 48, 120)}\" font-family=\"sans-serif\" font-size=\"22\" fill=\"#999\">${label}</text>\n</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

async function fetchHtml(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Fetch failed: ${url}`);
  return res.text();
}

function normalizeDate(input: string | null | undefined) {
  if (!input) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function findDateInJsonLd(node: any): string | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findDateInJsonLd(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof node === "object") {
    const direct =
      node.datePublished || node.dateCreated || node.uploadDate || node.dateModified;
    if (direct) return direct;
    for (const key of Object.keys(node)) {
      const found = findDateInJsonLd(node[key]);
      if (found) return found;
    }
  }
  return null;
}

function extractPublishedAtFromHtml(html: string): string | null {
  const $ = load(html);
  const meta =
    $('meta[property="article:published_time"]').attr("content") ||
    $('meta[property="og:published_time"]').attr("content") ||
    $('meta[name="pubdate"]').attr("content") ||
    $('meta[name="publish-date"]').attr("content") ||
    $('meta[name="date"]').attr("content") ||
    $('meta[itemprop="datePublished"]').attr("content") ||
    "";
  const time = $("time[datetime]").first().attr("datetime") || "";
  const jsonLd = $('script[type="application/ld+json"]')
    .map((_, el) => $(el).text())
    .get();

  const candidates: string[] = [];
  if (meta) candidates.push(meta);
  if (time) candidates.push(time);

  for (const raw of jsonLd) {
    try {
      const parsed = JSON.parse(raw);
      const found = findDateInJsonLd(parsed);
      if (found) candidates.push(found);
    } catch {
      // ignore
    }
  }

  for (const c of candidates) {
    const normalized = normalizeDate(c);
    if (normalized) return normalized;
  }
  return null;
}

async function extractOgImage(url: string): Promise<string | null> {
  try {
    const html = await fetchHtml(url);
    const $ = load(html);
    const og =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      $('meta[name="twitter:image:src"]').attr("content") ||
      "";
    if (og) return toAbsolute(url, og);
    const firstImg = $("img").first().attr("src") || "";
    if (firstImg) return toAbsolute(url, firstImg);
  } catch {
    return null;
  }
  return null;
}

async function extractPublishedAt(url: string): Promise<string | null> {
  try {
    const html = await fetchHtml(url);
    return extractPublishedAtFromHtml(html);
  } catch {
    return null;
  }
}

async function scrapeUDL(url: string): Promise<ScrapedWork[]> {
  const html = await fetchHtml("https://u-d-l.com/");
  const $ = load(html);
  const items: ScrapedWork[] = [];
  $('a[href^="/work/"]').each((_, el) => {
    const href = $(el).attr("href") || "";
    if (href === "/work/") return;
    if (!/^\/work\/[^/?#]+\/?$/.test(href)) return;
    const title = $(el).text().replace(/\s+/g, " ").trim();
    if (!title) return;
    if (IGNORE_TITLES.has(title.toLowerCase())) return;
    const workUrl = normalizeUrl(toAbsolute(url, href));
    items.push({
      title,
      workUrl,
      thumbnailUrl: placeholderImage(workUrl),
    });
  });
  return items.slice(0, 12);
}

async function scrapeNDC(url: string): Promise<ScrapedWork[]> {
  const html = await fetchHtml(url);
  const $ = load(html);
  const items: ScrapedWork[] = [];
  $('a[href^="/zh/projects/"], a[href^="/projects/"]').each((_, el) => {
    const href = $(el).attr("href") || "";
    const title = $(el).text().replace(/\s+/g, " ").trim();
    if (!title) return;
    if (IGNORE_TITLES.has(title.toLowerCase())) return;
    if (!/^\/(zh\/)?projects\/[^/?#]+\/?$/.test(href)) return;
    const workUrl = normalizeUrl(toAbsolute(url, href));
    items.push({
      title,
      workUrl,
      thumbnailUrl: placeholderImage(workUrl),
    });
  });
  return items.slice(0, 12);
}

async function scrapePortoRocha(url: string): Promise<ScrapedWork[]> {
  const html = await fetchHtml(url);
  const $ = load(html);
  const items: ScrapedWork[] = [];
  $("a").each((_, el) => {
    const href = $(el).attr("href") || "";
    const title = $(el).text().replace(/\s+/g, " ").trim();
    if (!title) return;
    if (IGNORE_TITLES.has(title.toLowerCase())) return;
    if (!href.startsWith("/")) return;
    if (href === "/" || href.startsWith("/about") || href.startsWith("/contact"))
      return;
    const workUrl = normalizeUrl(toAbsolute(url, href));
    items.push({
      title,
      workUrl,
      thumbnailUrl: placeholderImage(workUrl),
    });
  });
  return items.slice(0, 12);
}

async function scrapeByUrl(url: string): Promise<ScrapedWork[]> {
  if (url.includes("u-d-l.com/work")) return scrapeUDL(url);
  if (url.includes("ndc.co.jp")) return scrapeNDC(url);
  if (url.includes("portorocha.com")) return scrapePortoRocha(url);
  return [];
}

export async function POST() {
  const supabase = await createClient();

  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: studios, error } = await supabase
    .from("studios")
    .select("id,name,feed_url")
    .eq("is_active", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!studios || studios.length === 0) {
    return NextResponse.json({ inserted: 0 });
  }

  const now = new Date().toISOString();
  const rows: Array<{
    studio_id: string;
    title: string;
    thumbnail_url: string;
    work_url: string;
    published_at: string | null;
    first_seen_at: string;
    is_visible: boolean;
  }> = [];

  for (const studio of studios) {
    if (!studio.feed_url) continue;
    let scraped: ScrapedWork[] = [];
    try {
      scraped = await scrapeByUrl(studio.feed_url);
    } catch {
      scraped = [];
    }

    if (scraped.length === 0) continue;

    const uniqueScraped = new Map<string, ScrapedWork>();
    for (const item of scraped) {
      const key = normalizeUrl(item.workUrl).toLowerCase();
      if (!uniqueScraped.has(key)) uniqueScraped.set(key, item);
    }
    scraped = Array.from(uniqueScraped.values());

    const { data: existing } = await supabase
      .from("works")
      .select("work_url")
      .eq("studio_id", studio.id);

    const existingSet = new Set(
      (existing || []).map((w) => normalizeUrl(w.work_url).toLowerCase())
    );

    for (const item of scraped) {
      const normalized = normalizeUrl(item.workUrl).toLowerCase();
      if (existingSet.has(normalized)) continue;
      const ogImage = await extractOgImage(item.workUrl);
      const thumb = ogImage || item.thumbnailUrl || placeholderImage(item.workUrl);
      const published =
        normalizeDate(item.publishedAt || null) ||
        (await extractPublishedAt(item.workUrl));
      rows.push({
        studio_id: studio.id,
        title: item.title,
        thumbnail_url: thumb,
        work_url: normalizeUrl(item.workUrl),
        published_at: published || null,
        first_seen_at: now,
        is_visible: true,
      });
    }
  }

  if (rows.length === 0) {
    return NextResponse.json({ inserted: 0 });
  }

  const { error: insertError } = await supabase
    .from("works")
    .upsert(rows, { onConflict: "studio_id,work_url", ignoreDuplicates: true });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ inserted: rows.length });
}
