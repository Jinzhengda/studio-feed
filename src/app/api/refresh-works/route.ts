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

  // 找到所有作品链接
  $('a.item[href^="/work/"]').each((_, el) => {
    const href = $(el).attr("href") || "";
    if (!href || href === "/work/") return;

    // 提取标题
    const titleEl = $(el).find(".item_title span").first();
    const title = titleEl.text().trim();
    if (!title || IGNORE_TITLES.has(title.toLowerCase())) return;

    const workUrl = normalizeUrl(toAbsolute("https://u-d-l.com/", href));

    // 从 bg-set 属性中提取图片 URL
    const imageWrap = $(el).find(".image_wrap");
    const bgSet = imageWrap.attr("bg-set") || "";
    let thumbnailUrl = placeholderImage(workUrl);

    if (bgSet) {
      // bg-set 格式: "url1.jpg,url2.jpg 2x" - 取第一个不带空格的 URL
      const urls = bgSet.split(",");
      for (const urlPart of urls) {
        const cleanUrl = urlPart.trim().split(" ")[0];
        if (cleanUrl && cleanUrl.startsWith("//")) {
          thumbnailUrl = "https:" + cleanUrl;
          break;
        }
      }
    }

    items.push({
      title,
      workUrl,
      thumbnailUrl,
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

async function scrapeGeneric(url: string): Promise<ScrapedWork[]> {
  const html = await fetchHtml(url);
  const $ = load(html);
  const items: ScrapedWork[] = [];
  const baseUrl = new URL(url).origin;

  // 尝试多种常见的作品列表选择器
  const selectors = [
    '[data-behavior="projectCard"] a',
    '[data-project] a',
    '[data-work] a',
    'a[href*="/work/"]',
    'a[href*="/project"]',
    'a[href*="/projects/"]',
    'a[href*="/portfolio"]',
    'a[href*="/case"]',
    '.work a',
    '.project a',
    '.portfolio a',
    '.case-study a',
    'article a',
    '.grid a',
    '.item a',
    '[class*="work"] a',
    '[class*="project"] a'
  ];

  const foundLinks = new Set<string>();

  for (const selector of selectors) {
    $(selector).each((_, el) => {
      const $link = $(el);
      let href = $link.attr("href") || "";

      // 如果链接本身没有 href，尝试找父元素
      if (!href) {
        href = $link.closest("a").attr("href") || "";
      }

      if (!href || href === "#" || href === "/" || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      // 跳过导航链接
      const lowerHref = href.toLowerCase();
      if (lowerHref.includes("/about") || lowerHref.includes("/contact") ||
          lowerHref.includes("/team") || lowerHref.includes("/news") ||
          lowerHref.includes("/archive")) return;

      const fullUrl = toAbsolute(url, href);
      const normalized = normalizeUrl(fullUrl);

      // 避免重复
      if (foundLinks.has(normalized)) return;

      // 允许同域名或子路径
      if (!normalized.startsWith(baseUrl) && !normalized.startsWith(url)) return;

      // 提取标题
      let title = $link.attr("title") || $link.attr("alt") || $link.attr("aria-label") || "";
      if (!title) {
        title = $link.find("h1, h2, h3, h4, h5, .title, .name, [class*='title'], [class*='name']").first().text().trim();
      }
      if (!title) {
        const $parent = $link.closest('[data-behavior="projectCard"], [data-project], article, .item, .work, .project');
        title = $parent.find("h1, h2, h3, h4, .title").first().text().trim();
      }
      if (!title) {
        title = $link.text().replace(/\s+/g, " ").trim();
      }

      if (!title || title.length < 2 || title.length > 200) return;
      if (IGNORE_TITLES.has(title.toLowerCase())) return;

      // 提取图片
      let thumbnailUrl = placeholderImage(normalized);

      // 查找图片
      let $img = $link.find("img").first();
      if (!$img.length) {
        const $parent = $link.closest('[data-behavior="projectCard"], [data-project], article, .item');
        $img = $parent.find("img").first();
      }

      if ($img.length) {
        const src = $img.attr("src") || $img.attr("data-src") || $img.attr("data-lazy") || $img.attr("data-original");
        if (src) {
          thumbnailUrl = toAbsolute(url, src);
        }
      }

      // 检查背景图
      if (thumbnailUrl === placeholderImage(normalized)) {
        const $bgEl = $link.find("[style*='background-image']").first();
        if ($bgEl.length) {
          const style = $bgEl.attr("style") || "";
          const match = style.match(/url\(['"]?([^'"]+)['"]?\)/);
          if (match && match[1]) {
            thumbnailUrl = toAbsolute(url, match[1]);
          }
        }
      }

      foundLinks.add(normalized);
      items.push({
        title,
        workUrl: normalized,
        thumbnailUrl,
      });
    });

    if (items.length >= 12) break;
  }

  return items.slice(0, 12);
}

async function scrapePentagram(url: string): Promise<ScrapedWork[]> {
  const html = await fetchHtml(url);
  const $ = load(html);
  const items: ScrapedWork[] = [];

  $('[data-behavior="projectCard"]').each((_, el) => {
    const $card = $(el);
    const $link = $card.find("a").first();
    const href = $link.attr("href") || "";

    if (!href) return;

    const workUrl = normalizeUrl(toAbsolute(url, href));

    // 提取标题
    let title = $card.find("h2, h3, .title, [class*='title']").first().text().trim();
    if (!title) {
      title = $link.attr("title") || $link.text().trim();
    }

    if (!title || IGNORE_TITLES.has(title.toLowerCase())) return;

    // 提取图片 - Pentagram 使用多种方式
    let thumbnailUrl = placeholderImage(workUrl);

    // 方法1: 查找 img 标签
    const $img = $card.find("img").first();
    if ($img.length) {
      const src = $img.attr("src") || $img.attr("data-src") || $img.attr("srcset")?.split(" ")[0];
      if (src) {
        thumbnailUrl = toAbsolute(url, src);
      }
    }

    // 方法2: 查找 picture 标签
    if (thumbnailUrl === placeholderImage(workUrl)) {
      const $picture = $card.find("picture source").first();
      if ($picture.length) {
        const srcset = $picture.attr("srcset");
        if (srcset) {
          thumbnailUrl = toAbsolute(url, srcset.split(" ")[0]);
        }
      }
    }

    // 方法3: 查找背景图
    if (thumbnailUrl === placeholderImage(workUrl)) {
      const $bgEl = $card.find("[style*='background']").first();
      if ($bgEl.length) {
        const style = $bgEl.attr("style") || "";
        const match = style.match(/url\(['"]?([^'"]+)['"]?\)/);
        if (match && match[1]) {
          thumbnailUrl = toAbsolute(url, match[1]);
        }
      }
    }

    items.push({
      title,
      workUrl,
      thumbnailUrl,
    });
  });

  return items.slice(0, 12);
}

async function scrapeByUrl(url: string): Promise<ScrapedWork[]> {
  // 优先使用专门的抓取逻辑
  if (url.includes("u-d-l.com")) return scrapeUDL(url);
  if (url.includes("ndc.co.jp")) return scrapeNDC(url);
  if (url.includes("portorocha.com")) return scrapePortoRocha(url);
  if (url.includes("pentagram.com")) return scrapePentagram(url);

  // 使用通用抓取
  return scrapeGeneric(url);
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
