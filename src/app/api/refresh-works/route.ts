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

function improveImageUrlQuality(input: string) {
  try {
    const url = new URL(input);
    if (url.hostname.includes("cdn.sanity.io")) {
      const w = Number(url.searchParams.get("w") || "0");
      if (!w || w < 1600) {
        url.searchParams.set("w", "1920");
      }
      url.searchParams.set("q", "90");
      url.searchParams.set("auto", "format");
    } else if (url.hostname.includes(".imgix.net")) {
      const w = Number(url.searchParams.get("w") || "0");
      if (!w || w < 1600) url.searchParams.set("w", "1920");
      url.searchParams.set("q", "90");
      url.searchParams.set("auto", "format,compress");
    } else if (url.hostname.includes("res.cloudinary.com")) {
      // insert quality/width transformations into Cloudinary URL path
      const parts = url.pathname.split("/upload/");
      if (parts.length === 2) {
        url.pathname = parts[0] + "/upload/w_1920,q_90,f_auto/" + parts[1];
      }
    }
    return url.toString();
  } catch {
    return input;
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

function findDateInJsonLd(node: unknown): string | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findDateInJsonLd(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    const direct =
      obj.datePublished || obj.dateCreated || obj.uploadDate || obj.dateModified;
    if (typeof direct === "string") return direct;
    for (const key of Object.keys(obj)) {
      const found = findDateInJsonLd(obj[key]);
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
  const html = await fetchHtml(url);
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
      // bg-set 格式: "url1.jpg,url@2x.jpg 2x" - 优先选择高清图片，避免SVG占位符
      const parts = bgSet.split(",").map((s) => s.trim()).filter(Boolean);

      // 优先策略：找 @2x.jpg 或 @2x.png
      for (let i = parts.length - 1; i >= 0; i--) {
        const cleanUrl = parts[i].split(" ")[0];
        if (cleanUrl && cleanUrl.startsWith("//") &&
            (cleanUrl.includes("@2x.jpg") || cleanUrl.includes("@2x.png"))) {
          thumbnailUrl = "https:" + cleanUrl;
          break;
        }
      }

      // 回退：找任何 jpg/png（非SVG）
      if (thumbnailUrl === placeholderImage(workUrl)) {
        for (let i = parts.length - 1; i >= 0; i--) {
          const cleanUrl = parts[i].split(" ")[0];
          if (cleanUrl && cleanUrl.startsWith("//") &&
              (cleanUrl.endsWith(".jpg") || cleanUrl.endsWith(".png"))) {
            thumbnailUrl = "https:" + cleanUrl;
            break;
          }
        }
      }

      // 最后回退：任何非SVG的URL
      if (thumbnailUrl === placeholderImage(workUrl)) {
        for (let i = parts.length - 1; i >= 0; i--) {
          const cleanUrl = parts[i].split(" ")[0];
          if (cleanUrl && cleanUrl.startsWith("//") && !cleanUrl.endsWith(".svg")) {
            thumbnailUrl = "https:" + cleanUrl;
            break;
          }
        }
      }
    }

    items.push({
      title,
      workUrl,
      thumbnailUrl,
    });
  });

  return items.slice(0, 24);
}

async function scrapeNDC(url: string): Promise<ScrapedWork[]> {
  const html = await fetchHtml(url);
  const $ = load(html);
  const items: ScrapedWork[] = [];
  const seen = new Set<string>();

  $('a[href^="/zh/projects/"], a[href^="/projects/"]').each((_, el) => {
    const $link = $(el);
    const href = $link.attr("href") || "";
    if (!href) return;
    if (!/^\/(zh\/)?projects\/[^/?#]+\/?$/.test(href)) return;

    const workUrl = normalizeUrl(toAbsolute(url, href));
    const key = workUrl.toLowerCase();
    if (seen.has(key)) return;

    const title = $link.text().replace(/\s+/g, " ").trim();
    if (!title || IGNORE_TITLES.has(title.toLowerCase())) return;

    let thumbnailUrl = "";

    // Try img inside the link
    const $img = $link.find("img").first();
    if ($img.length) {
      const srcset = $img.attr("srcset") || $img.attr("data-srcset") || "";
      const srcsetParts = srcset.split(",").map((s) => s.trim()).filter(Boolean);
      const srcFromSet = srcsetParts.length > 0 ? srcsetParts[srcsetParts.length - 1].split(" ")[0] : "";
      const src = srcFromSet || $img.attr("src") || $img.attr("data-src") || $img.attr("data-lazy") || "";
      if (src) thumbnailUrl = improveImageUrlQuality(toAbsolute(url, src));
    }

    // Try background-image style
    if (!thumbnailUrl) {
      const $bgEl = $link.find("[style*='background']").first();
      if ($bgEl.length) {
        const style = $bgEl.attr("style") || "";
        const match = style.match(/url\(['"]?([^'"]+)['"]?\)/);
        if (match && match[1]) thumbnailUrl = improveImageUrlQuality(toAbsolute(url, match[1]));
      }
    }

    if (!thumbnailUrl || thumbnailUrl.startsWith("data:image")) {
      thumbnailUrl = placeholderImage(workUrl);
    }

    seen.add(key);
    items.push({ title, workUrl, thumbnailUrl });
  });

  return items.slice(0, 12);
}

async function scrapePortoRocha(url: string): Promise<ScrapedWork[]> {
  const html = await fetchHtml(url);
  const $ = load(html);
  const items: ScrapedWork[] = [];
  const seen = new Set<string>();

  $("a").each((_, el) => {
    const $link = $(el);
    const href = $link.attr("href") || "";
    if (!href.startsWith("/")) return;
    if (
      href === "/" ||
      href.startsWith("/about") ||
      href.startsWith("/contact") ||
      href.startsWith("/shop") ||
      href.startsWith("/_nuxt") ||
      href.startsWith("/font") ||
      href.endsWith(".css") ||
      href.endsWith(".js") ||
      href.endsWith(".ico") ||
      href.includes("?")
    ) {
      return;
    }

    let title =
      $link.attr("aria-label") ||
      $link.attr("title") ||
      $link.find("h1, h2, h3, h4, .title, [class*='title']").first().text().trim() ||
      $link.text().replace(/\s+/g, " ").trim();

    if (!title) {
      const slug = href.split("/").filter(Boolean).pop() || "";
      title = slug.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
    }

    if (!title || IGNORE_TITLES.has(title.toLowerCase())) return;

    const workUrl = normalizeUrl(toAbsolute(url, href));
    const key = workUrl.toLowerCase();
    if (seen.has(key)) return;

    let thumbnailUrl = "";

    // 1) image in link
    let $img = $link.find("img").first();

    // 2) fallback to nearest card/article parent image
    if (!$img.length) {
      const $parent = $link.closest("article, .item, .work, .project, [class*='card'], [class*='project']");
      $img = $parent.find("img").first();
    }

    if ($img.length) {
      const srcset = $img.attr("srcset") || $img.attr("data-srcset") || "";
      const srcsetParts = srcset.split(",").map((s) => s.trim()).filter(Boolean);
      const srcFromSet = srcsetParts.length > 0 ? srcsetParts[srcsetParts.length - 1].split(" ")[0] : "";
      const src = srcFromSet || $img.attr("src") || $img.attr("data-src") || $img.attr("data-lazy") || "";
      if (src) thumbnailUrl = improveImageUrlQuality(toAbsolute(url, src));
    }

    // 3) background-image fallback
    if (!thumbnailUrl) {
      const $bgEl = $link.find("[style*='background']").first();
      if ($bgEl.length) {
        const style = $bgEl.attr("style") || "";
        const match = style.match(/url\(['"]?([^'"]+)['"]?\)/);
        if (match && match[1]) {
          thumbnailUrl = improveImageUrlQuality(toAbsolute(url, match[1]));
        }
      }
    }

    if (!thumbnailUrl || thumbnailUrl.startsWith("data:image")) {
      thumbnailUrl = placeholderImage(workUrl);
    }

    seen.add(key);
    items.push({
      title,
      workUrl,
      thumbnailUrl,
    });
  });

  return items.slice(0, 12);
}

async function scrapeGeneric(url: string): Promise<ScrapedWork[]> {
  const html = await fetchHtml(url);
  const $ = load(html);
  const items: ScrapedWork[] = [];
  const baseUrl = new URL(url);
  const baseDomain = baseUrl.hostname.split(".").slice(-2).join(".");

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
    'a[href*="/clients/"]',
    'a[href*="/case-study"]',
    'a[href*="/case-studies/"]',
    '.work a',
    '.project a',
    '.portfolio a',
    '.case-study a',
    'article a',
    '.grid a',
    '.item a',
    '[class*="work"] a',
    '[class*="project"] a',
    '[class*="case"] a',
    '[class*="client"] a'
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

      // 允许同域名或子域名（例如 www.example.com 和 example.com）
      try {
        const linkUrl = new URL(normalized);
        const linkDomain = linkUrl.hostname.split(".").slice(-2).join(".");
        if (linkDomain !== baseDomain) return;
      } catch {
        return;
      }

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
      // Last resort: derive title from URL slug
      if (!title) {
        const slug = href.split("/").filter(Boolean).pop() || "";
        title = slug.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
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
        const srcset = $img.attr("srcset") || $img.attr("data-srcset") || "";
        const srcsetParts = srcset.split(",").map((s) => s.trim()).filter(Boolean);
        const srcFromSet = srcsetParts.length > 0 ? srcsetParts[srcsetParts.length - 1].split(" ")[0] : "";
        const src = srcFromSet || $img.attr("src") || $img.attr("data-src") || $img.attr("data-lazy") || $img.attr("data-original") || "";
        if (src) {
          thumbnailUrl = improveImageUrlQuality(toAbsolute(url, src));
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

async function scrapeFromSitemap(url: string): Promise<ScrapedWork[]> {
  const origin = new URL(url).origin;
  const sitemapQueue = [`${origin}/sitemap.xml`];
  const visitedSitemaps = new Set<string>();
  const discoveredUrls: string[] = [];

  while (sitemapQueue.length > 0 && visitedSitemaps.size < 8 && discoveredUrls.length < 500) {
    const sitemapUrl = sitemapQueue.shift() || "";
    if (!sitemapUrl || visitedSitemaps.has(sitemapUrl)) continue;
    visitedSitemaps.add(sitemapUrl);

    let xml = "";
    try {
      xml = await fetchHtml(sitemapUrl);
    } catch {
      continue;
    }

    const $xml = load(xml, { xmlMode: true });

    // sitemap index
    const childSitemaps = $xml("sitemap > loc")
      .map((_, el) => $xml(el).text().trim())
      .get();

    if (childSitemaps.length > 0) {
      for (const child of childSitemaps) {
        if (!visitedSitemaps.has(child)) sitemapQueue.push(child);
      }
      continue;
    }

    // regular urlset
    const urls = $xml("url > loc")
      .map((_, el) => $xml(el).text().trim())
      .get();

    discoveredUrls.push(...urls);
  }

  const items: ScrapedWork[] = [];
  const seen = new Set<string>();

  for (const rawUrl of discoveredUrls) {
    const normalized = normalizeUrl(rawUrl);
    const lower = normalized.toLowerCase();

    if (!normalized.startsWith(origin)) continue;
    if (seen.has(lower)) continue;

    // Skip non-work pages
    if (
      lower.includes("/category/") ||
      lower.includes("/tag/") ||
      lower.includes("/author/") ||
      lower.includes("/wp-") ||
      lower.endsWith("/feed") ||
      lower.includes("?")
    ) {
      continue;
    }

    const looksLikeWork =
      lower.includes("/work") ||
      lower.includes("/project") ||
      lower.includes("/projects") ||
      lower.includes("/portfolio") ||
      lower.includes("/case") ||
      lower.includes("/client") ||
      lower.includes("/clients");

    if (!looksLikeWork) continue;

    const slug = normalized.split("/").filter(Boolean).pop() || "";
    const title = slug
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();

    if (!title || IGNORE_TITLES.has(title.toLowerCase())) continue;

    const og = await extractOgImage(normalized);

    seen.add(lower);
    items.push({
      title,
      workUrl: normalized,
      thumbnailUrl: og || placeholderImage(normalized),
    });

    if (items.length >= 12) break;
  }

  return items;
}

async function scrapeGenericWithFallback(url: string): Promise<ScrapedWork[]> {
  const origin = new URL(url).origin;
  const candidatePaths = [
    "",
    "/work",
    "/works",
    "/projects",
    "/portfolio",
    "/case-studies",
    "/clients",
    "/our-work",
  ];

  const candidates = Array.from(
    new Set(candidatePaths.map((path) => (path ? toAbsolute(origin, path) : url)))
  );

  const merged = new Map<string, ScrapedWork>();

  for (const candidate of candidates) {
    let result: ScrapedWork[] = [];
    try {
      result = await scrapeGeneric(candidate);
    } catch {
      result = [];
    }

    for (const item of result) {
      const key = normalizeUrl(item.workUrl).toLowerCase();
      if (!merged.has(key)) merged.set(key, item);
    }

    if (merged.size >= 12) break;
  }

  if (merged.size === 0) {
    const sitemapItems = await scrapeFromSitemap(url);
    for (const item of sitemapItems) {
      const key = normalizeUrl(item.workUrl).toLowerCase();
      if (!merged.has(key)) merged.set(key, item);
    }
  }

  return Array.from(merged.values()).slice(0, 12);
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

async function scrapeSDL(url: string): Promise<ScrapedWork[]> {
  const workListUrl = toAbsolute(url, "/work");
  const html = await fetchHtml(workListUrl);
  const $ = load(html);
  const items: ScrapedWork[] = [];
  const seen = new Set<string>();

  $('a[href^="/work/"]').each((_, el) => {
    const $link = $(el);
    const href = $link.attr("href") || "";
    if (!href || href === "/work") return;
    if (!/^\/work\/[^/?#]+\/?$/.test(href)) return;

    const workUrl = normalizeUrl(toAbsolute(url, href));
    const key = workUrl.toLowerCase();
    if (seen.has(key)) return;

    const title =
      $link.attr("aria-label") ||
      $link.attr("title") ||
      $link.find("h1, h2, h3, h4, .title, [class*='title']").first().text().trim() ||
      $link.text().replace(/\s+/g, " ").trim();

    if (!title || title.length < 2 || IGNORE_TITLES.has(title.toLowerCase())) return;

    let thumbnailUrl = "";
    const $img = $link.find("img").first();
    if ($img.length) {
      const srcset = $img.attr("srcset") || $img.attr("data-srcset") || "";
      const srcsetItems = srcset
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const srcFromSet =
        srcsetItems.length > 0
          ? srcsetItems[srcsetItems.length - 1].split(" ")[0] || ""
          : "";
      const src =
        srcFromSet ||
        $img.attr("src") ||
        $img.attr("data-src") ||
        $img.attr("data-lazy") ||
        "";
      if (src) thumbnailUrl = improveImageUrlQuality(toAbsolute(url, src));
    }

    if (!thumbnailUrl || thumbnailUrl.startsWith("data:image")) {
      thumbnailUrl = placeholderImage(workUrl);
    }

    seen.add(key);
    items.push({
      title,
      workUrl,
      thumbnailUrl,
    });
  });

  return items.slice(0, 24);
}

async function scrapeKIGI(): Promise<ScrapedWork[]> {
  const apiUrl = "https://ki-gi.com/wp-json/wp/v2/main_works?per_page=12&_embed";
  const items: ScrapedWork[] = [];

  try {
    const res = await fetch(apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      cache: "no-store",
    });

    if (!res.ok) return [];

    const posts = await res.json();
    if (!Array.isArray(posts)) return [];

    for (const post of posts) {
      const title = post.title?.rendered || "";
      const workUrl = post.link || "";
      if (!title || !workUrl) continue;

      let thumbnailUrl = placeholderImage(workUrl);
      const featuredMedia = post._embedded?.["wp:featuredmedia"];
      if (Array.isArray(featuredMedia) && featuredMedia.length > 0) {
        const sizes = featuredMedia[0].media_details?.sizes || {};
        const full = sizes.full?.source_url || featuredMedia[0].source_url;
        if (full) thumbnailUrl = improveImageUrlQuality(full);
      }

      items.push({
        title: title.replace(/<[^>]+>/g, "").trim(),
        workUrl: normalizeUrl(workUrl),
        thumbnailUrl,
      });
    }
  } catch {
    return [];
  }

  return items;
}

async function scrapeArea17(url: string): Promise<ScrapedWork[]> {
  const clientsUrl = toAbsolute(url, "/clients");
  const html = await fetchHtml(clientsUrl);
  const $ = load(html);
  const items: ScrapedWork[] = [];
  const seen = new Set<string>();

  $('a[href*="/clients/"]').each((_, el) => {
    const $link = $(el);
    const href = $link.attr("href") || "";
    if (!href) return;
    // Skip list page itself
    if (/\/clients\/?$/.test(href) || /\/fr\/clients\/?$/.test(href)) return;
    // Only deep client pages e.g. /clients/saint-laurent
    if (!/\/clients\/[^/?#]+/.test(href)) return;

    const workUrl = normalizeUrl(toAbsolute(url, href));
    const key = workUrl.toLowerCase();
    if (seen.has(key)) return;

    // Title from link text or aria-label, fallback to slug
    let title =
      $link.attr("aria-label") ||
      $link.attr("title") ||
      $link.find("h1,h2,h3,h4,.title,[class*='title'],[class*='name']").first().text().trim() ||
      $link.text().replace(/\s+/g, " ").trim();

    if (!title) {
      const slug = href.split("/").filter(Boolean).pop() || "";
      title = slug.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
    }
    if (!title || title.length < 2 || IGNORE_TITLES.has(title.toLowerCase())) return;

    let thumbnailUrl = "";
    const $img = $link.find("img").first();
    if ($img.length) {
      const srcset = $img.attr("srcset") || $img.attr("data-srcset") || "";
      const srcsetParts = srcset.split(",").map((s) => s.trim()).filter(Boolean);
      const srcFromSet = srcsetParts.length > 0 ? srcsetParts[srcsetParts.length - 1].split(" ")[0] : "";
      const src = srcFromSet || $img.attr("src") || $img.attr("data-src") || "";
      if (src) thumbnailUrl = improveImageUrlQuality(toAbsolute(url, src));
    }
    if (!thumbnailUrl || thumbnailUrl.startsWith("data:image")) {
      thumbnailUrl = placeholderImage(workUrl);
    }

    seen.add(key);
    items.push({ title, workUrl, thumbnailUrl });
  });

  return items.slice(0, 12);
}

async function scrapeByUrl(url: string): Promise<ScrapedWork[]> {
  // 优先使用专门的抓取逻辑
  if (url.includes("u-d-l.com")) return scrapeUDL(url);
  if (url.includes("ki-gi.com")) return scrapeKIGI();
  if (url.includes("ndc.co.jp")) return scrapeNDC(url);
  if (url.includes("portorocha.com")) return scrapePortoRocha(url);
  if (url.includes("pentagram.com")) return scrapePentagram(url);
  if (url.includes("stockholmdesignlab.se")) return scrapeSDL(url);
  if (url.includes("area17.com")) return scrapeArea17(url);

  // 使用通用抓取（含路径与 sitemap 回退）
  return scrapeGenericWithFallback(url);
}

async function processStudio(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studio: { id: string; name: string; feed_url: string | null },
  now: string
) {
  if (!studio.feed_url) {
    return {
      debug: { studio: studio.name, scraped: 0, existing: 0, matched: 0, updated: 0, inserted: 0 },
      rows: [],
      thumbnailUpdates: [],
    };
  }

  let scraped: ScrapedWork[] = [];
  try {
    scraped = await scrapeByUrl(studio.feed_url);
  } catch {
    scraped = [];
  }

  const studioDebug = { studio: studio.name, scraped: scraped.length, existing: 0, matched: 0, updated: 0, inserted: 0 };

  if (scraped.length === 0) {
    return { debug: studioDebug, rows: [], thumbnailUpdates: [] };
  }

  const uniqueScraped = new Map<string, ScrapedWork>();
  for (const item of scraped) {
    const key = normalizeUrl(item.workUrl).toLowerCase();
    if (!uniqueScraped.has(key)) uniqueScraped.set(key, item);
  }
  scraped = Array.from(uniqueScraped.values());

  const { data: existing } = await supabase
    .from("works")
    .select("id,work_url,thumbnail_url")
    .eq("studio_id", studio.id);

  studioDebug.existing = existing?.length ?? 0;

  const existingMap = new Map(
    (existing || []).map((w) => [normalizeUrl(w.work_url).toLowerCase(), w])
  );

  const rows: Array<{
    studio_id: string;
    title: string;
    thumbnail_url: string;
    work_url: string;
    published_at: string | null;
    first_seen_at: string;
    is_visible: boolean;
  }> = [];
  const thumbnailUpdates: Array<{ id: string; thumbnail_url: string }> = [];

  for (const item of scraped) {
    const normalized = normalizeUrl(item.workUrl).toLowerCase();
    const existingWork = existingMap.get(normalized);

    if (existingWork) {
      studioDebug.matched++;
      const currentThumb = existingWork.thumbnail_url || "";
      const scrapedThumb =
        item.thumbnailUrl && !item.thumbnailUrl.startsWith("data:image/svg+xml")
          ? item.thumbnailUrl
          : null;
      const needsUpdate =
        !currentThumb ||
        currentThumb.startsWith("data:image/svg+xml") ||
        (scrapedThumb != null && scrapedThumb !== currentThumb);
      if (!needsUpdate) continue;

      const ogImage = scrapedThumb ? null : await extractOgImage(item.workUrl);
      const nextThumb = scrapedThumb || ogImage;

      if (nextThumb) {
        thumbnailUpdates.push({ id: existingWork.id, thumbnail_url: nextThumb });
        studioDebug.updated++;
      }
      continue;
    }

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
    studioDebug.inserted++;
  }

  return { debug: studioDebug, rows, thumbnailUpdates };
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

  // 并行处理所有工作室，提升性能
  const results = await Promise.all(
    studios.map((studio) => processStudio(supabase, studio, now))
  );

  const allRows = results.flatMap((r) => r.rows);
  const allThumbnailUpdates = results.flatMap((r) => r.thumbnailUpdates);
  const debugLog = results.map((r) => r.debug);

  if (allRows.length > 0) {
    const { error: insertError } = await supabase
      .from("works")
      .upsert(allRows, { onConflict: "studio_id,work_url", ignoreDuplicates: true });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  if (allThumbnailUpdates.length > 0) {
    for (const update of allThumbnailUpdates) {
      const { error: updateError } = await supabase
        .from("works")
        .update({ thumbnail_url: update.thumbnail_url })
        .eq("id", update.id);
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ inserted: allRows.length, updated: allThumbnailUpdates.length, debug: debugLog });
}
