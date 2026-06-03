import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { load } from "cheerio";

type ScrapedWork = {
  title: string;
  workUrl: string;
  thumbnailUrl: string;
  publishedAt?: string | null;
};

type CheerioRoot = ReturnType<typeof load>;
type CheerioSelection = ReturnType<CheerioRoot>;

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
    const syntheticItem = url.searchParams.get("sf_item");
    url.search = syntheticItem ? `?sf_item=${encodeURIComponent(syntheticItem)}` : "";
    url.hash = "";
    return `${url.protocol}//${host}${path}${url.search}`;
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

function isVideoUrl(input: string) {
  return /\.(mp4|webm|mov)(\?|$)/i.test(input);
}

function splitSrcset(srcset: string) {
  return srcset
    .split(/,\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function getBestSrcFromSrcset(srcset: string) {
  const srcsetParts = splitSrcset(srcset);
  if (srcsetParts.length === 0) return "";
  return srcsetParts[srcsetParts.length - 1].split(/\s+/)[0] || "";
}

function getBestSrcFromCommaList(input: string) {
  const parts = input
    .split(/,\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return "";
  return parts[parts.length - 1].split(/\s+/)[0] || "";
}

function normalizeMediaUrl(base: string, input: string) {
  const absolute = toAbsolute(base, input);

  try {
    const url = new URL(absolute);
    if (url.pathname === "/_vercel/image" || url.pathname === "/_next/image") {
      const source = url.searchParams.get("url");
      if (source) return improveImageUrlQuality(source);
    }
  } catch {
    // Fall through to the original URL.
  }

  return isVideoUrl(absolute) ? absolute : improveImageUrlQuality(absolute);
}

function isUsableMediaUrl(input: string | null | undefined) {
  if (!input) return false;
  if (input.startsWith("data:image")) return false;
  if (input.includes("A17_social.png")) return false;
  if (input.includes("pentagram_social.png")) return false;
  if (input.includes("37df6095d115ceb716614cbdf051878398d4bd2a-640x640.jpg")) {
    return false;
  }
  if (input.includes("2496f8b08dad6c0b1ebee0ece7f60b50861de478-640x640.jpg")) {
    return false;
  }
  if (input.includes("b8ab1e61cb44fabfd0c74bfc973655ebbbc95eea-512x512.png")) {
    return false;
  }
  if (input.includes("f23de3fda696f1274470d753c02a20ee39586685-640x640.png")) {
    return false;
  }
  if (
    input.includes(
      "5ca8fb4194fcd82fbe6b83b6d701f1f8cfc7f163-1200x630.png"
    )
  ) {
    return false;
  }
  if (
    input.includes(
      "e2ee60a94e1ccaae172c0c8304c59572d6316bb2-1200x630.png"
    )
  ) {
    return false;
  }
  return true;
}

function firstUsableMediaUrl(base: string, candidates: Array<string | null | undefined>) {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const normalized = normalizeMediaUrl(base, candidate);
    if (isUsableMediaUrl(normalized)) return normalized;
  }
  return null;
}

function mediaFromStyle(base: string, style: string | null | undefined) {
  if (!style) return null;
  const matches = [...style.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)];
  return firstUsableMediaUrl(base, matches.map((match) => match[1]));
}

function extractMediaFromSelection(
  $: CheerioRoot,
  base: string,
  $root: CheerioSelection
) {
  const select = (selector: string) => $root.filter(selector).add($root.find(selector));

  const videoCandidates: string[] = [];
  select("video").each((_, el) => {
    const $el = $(el);
    videoCandidates.push(
      $el.attr("data-videobackgroundresponsive-desktop") || "",
      $el.attr("data-video-src") || "",
      $el.attr("data-src") || "",
      $el.attr("src") || "",
      $el.attr("poster") || ""
    );
  });
  select("video source").each((_, el) => {
    const $el = $(el);
    videoCandidates.push($el.attr("src") || "", $el.attr("data-src") || "");
  });
  const video = firstUsableMediaUrl(base, videoCandidates);
  if (video) return video;

  const imageCandidates: string[] = [];
  select("source").each((_, el) => {
    const $el = $(el);
    imageCandidates.push(
      getBestSrcFromSrcset($el.attr("srcset") || ""),
      getBestSrcFromSrcset($el.attr("data-srcset") || ""),
      $el.attr("data-src") || "",
      $el.attr("src") || ""
    );
  });
  select("img").each((_, el) => {
    const $el = $(el);
    imageCandidates.push(
      getBestSrcFromSrcset($el.attr("srcset") || ""),
      getBestSrcFromSrcset($el.attr("data-srcset") || ""),
      $el.attr("data-src") || "",
      $el.attr("data-lazy") || "",
      $el.attr("data-original") || "",
      $el.attr("src") || ""
    );
  });
  select("[bg-set]").each((_, el) => {
    const bgSet = $(el).attr("bg-set") || "";
    imageCandidates.push(getBestSrcFromCommaList(bgSet));
  });
  const image = firstUsableMediaUrl(base, imageCandidates);
  if (image) return image;

  for (const el of select("[style*='background']").toArray()) {
    const styleMedia = mediaFromStyle(base, $(el).attr("style"));
    if (styleMedia) return styleMedia;
  }

  return null;
}

function extractMediaOrPlaceholder(
  $: CheerioRoot,
  base: string,
  $root: CheerioSelection,
  seed: string
) {
  return extractMediaFromSelection($, base, $root) || placeholderImage(seed);
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
      // Pentagram and other imgix tenants sign URLs with `s=`; mutating params breaks them (403).
      if (url.searchParams.has("s")) {
        return input;
      }
      url.searchParams.delete("h");
      url.searchParams.delete("dpr");
      url.searchParams.delete("blur");
      url.searchParams.delete("crop");
      const w = Number(url.searchParams.get("w") || "0");
      if (!w || w < 1600) url.searchParams.set("w", "1920");
      url.searchParams.set("q", "90");
      url.searchParams.set("auto", "format,compress");
    } else if (url.hostname.includes("images.prismic.io")) {
      const w = Number(url.searchParams.get("w") || "0");
      if (!w || w < 1600) url.searchParams.set("w", "1600");
      url.searchParams.set("q", "90");
      if (!url.searchParams.get("auto")) {
        url.searchParams.set("auto", "format,compress");
      }
    } else if (url.hostname === "image.mux.com") {
      const width = Number(url.searchParams.get("width") || "0");
      if (!width || width < 1600) url.searchParams.set("width", "1600");
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

function humanizeSlug(input: string) {
  return decodeURIComponent(input)
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

function appendSyntheticItem(url: string, itemId: string | number) {
  try {
    const next = new URL(url);
    next.searchParams.set("sf_item", String(itemId));
    return normalizeUrl(next.toString());
  } catch {
    return normalizeUrl(url);
  }
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

function findMediaInJsonLd(node: unknown): string | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findMediaInJsonLd(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof node === "string") {
    return /\.(jpg|jpeg|png|webp|gif|heif|avif|mp4|webm|mov)(\?|$)/i.test(node)
      ? node
      : null;
  }
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    const direct =
      obj.image || obj.thumbnailUrl || obj.contentUrl || obj.url;
    if (typeof direct === "string") {
      const found = findMediaInJsonLd(direct);
      if (found) return found;
    }
    const keys = ["image", "thumbnailUrl", "contentUrl", "associatedMedia"];
    for (const key of keys) {
      const found = findMediaInJsonLd(obj[key]);
      if (found) return found;
    }
    for (const key of Object.keys(obj)) {
      const found = findMediaInJsonLd(obj[key]);
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

function extractFirstVideoUrlFromHtml(html: string, pageUrl: string) {
  const candidates = [
    ...html.matchAll(/https?:\\?\/\\?\/[^"'<>\\\s]+?\.(?:mp4|webm|mov)/gi),
  ].map((match) => match[0].replace(/\\\//g, "/"));

  let slug = "";
  try {
    slug = new URL(pageUrl).pathname.split("/").filter(Boolean).pop() || "";
  } catch {
    slug = "";
  }

  if (slug) {
    const matchingSlug = candidates.find((url) =>
      url.includes(`/media/pages/work/${slug}/`)
    );
    if (matchingSlug) return matchingSlug;
  }

  for (const url of candidates) {
    if (url.includes("/media/pages/work/")) return url;
  }

  return candidates[0] || null;
}

async function extractFirstMediaUrlFromNuxtPayload(html: string, pageUrl: string) {
  const $ = load(html);
  const payloadSrc = $('#__NUXT_DATA__[data-src]').attr("data-src") || "";
  if (!payloadSrc) return null;

  try {
    const payloadUrl = toAbsolute(pageUrl, payloadSrc);
    const payload = await fetchHtml(payloadUrl);
    const candidates = [
      ...payload.matchAll(
        /https?:\\?\/\\?\/[^"'<>\\\s]+?\.(?:jpg|jpeg|png|webp|gif|heif)(?:\?[^"'<>\\\s]*)?/gi
      ),
    ].map((match) => match[0].replace(/\\\//g, "/"));

    for (const candidate of candidates) {
      if (candidate.includes(".svg")) continue;
      const normalized = normalizeMediaUrl(pageUrl, candidate);
      if (isUsableMediaUrl(normalized)) return normalized;
    }
  } catch {
    return null;
  }

  return null;
}

async function extractBestMedia(url: string): Promise<string | null> {
  try {
    const html = await fetchHtml(url);
    const $ = load(html);
    const metaCandidates = [
      $('meta[property="og:image"]').attr("content") ||
        "",
      $('meta[name="twitter:image"]').attr("content") ||
        "",
      $('meta[name="twitter:image:src"]').attr("content") ||
        "",
    ];
    const metaMedia = firstUsableMediaUrl(url, metaCandidates);
    if (metaMedia) return metaMedia;

    const firstVideo =
      $("video source").first().attr("src") ||
      $("video").first().attr("src") ||
      extractFirstVideoUrlFromHtml(html, url) ||
      "";
    const videoMedia = firstUsableMediaUrl(url, [firstVideo]);
    if (videoMedia) return videoMedia;

    const jsonLd = $('script[type="application/ld+json"]')
      .map((_, el) => $(el).text())
      .get();
    for (const raw of jsonLd) {
      try {
        const found = findMediaInJsonLd(JSON.parse(raw));
        const jsonLdMedia = firstUsableMediaUrl(url, [found]);
        if (jsonLdMedia) return jsonLdMedia;
      } catch {
        // ignore
      }
    }

    const bodyMedia = extractMediaFromSelection($, url, $("body"));
    if (bodyMedia) return bodyMedia;

    const payloadMedia = await extractFirstMediaUrlFromNuxtPayload(html, url);
    if (payloadMedia) return payloadMedia;
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

    const $link = $(el);
    const thumbnailUrl = extractMediaOrPlaceholder($, url, $link, workUrl);

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

    const thumbnailUrl = extractMediaOrPlaceholder($, url, $link, workUrl);

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

    const $mediaRoot = $link.closest("article, .item, .work, .project, [class*='card'], [class*='project']");
    const thumbnailUrl = extractMediaOrPlaceholder(
      $,
      url,
      $mediaRoot.length ? $mediaRoot : $link,
      workUrl
    );

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

      const $mediaRoot = $link.closest(
        '[data-behavior="projectCard"], [data-project], [data-work], article, .item, .work, .project, .case-study, [class*="card"], [class*="project"], [class*="work"], [class*="case"]'
      );
      const thumbnailUrl = extractMediaOrPlaceholder(
        $,
        url,
        $mediaRoot.length ? $mediaRoot : $link,
        normalized
      );

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

    const media = await extractBestMedia(normalized);

    seen.add(lower);
    items.push({
      title,
      workUrl: normalized,
      thumbnailUrl: media || placeholderImage(normalized),
    });

    if (items.length >= 12) break;
  }

  return items;
}

async function scrapeCargoSitemap(
  url: string,
  options: { maxItems?: number; skipSlugs?: string[] } = {}
): Promise<ScrapedWork[]> {
  const origin = new URL(url).origin;
  const xml = await fetchHtml(`${origin}/sitemap.xml`);
  const $xml = load(xml, { xmlMode: true });
  const items: ScrapedWork[] = [];
  const seen = new Set<string>();
  const skipSlugs = new Set(
    (options.skipSlugs || ["index", "info", "portfolio", "about", "contact"]).map((slug) =>
      slug.toLowerCase()
    )
  );

  $xml("url").each((_, el) => {
    if (items.length >= (options.maxItems || 24)) return;

    const $url = $xml(el);
    const rawLoc = $url.children("loc").first().text().trim();
    if (!rawLoc) return;

    const workUrl = normalizeUrl(rawLoc);
    const key = workUrl.toLowerCase();
    if (seen.has(key) || !workUrl.startsWith(origin)) return;

    const slug = workUrl.split("/").filter(Boolean).pop() || "";
    if (!slug || skipSlugs.has(slug.toLowerCase())) return;

    const imageLoc = $url.find("image\\:loc, loc").last().text().trim();
    if (!imageLoc || imageLoc === rawLoc) return;

    const title = humanizeSlug(slug);
    if (!title || IGNORE_TITLES.has(title.toLowerCase())) return;

    seen.add(key);
    items.push({
      title,
      workUrl,
      thumbnailUrl: improveImageUrlQuality(imageLoc),
    });
  });

  return items;
}

type CargoImage = {
  id?: string | number;
  hash?: string;
  name?: string;
  width?: number;
  height?: number;
};

async function scrapeCargoPageImages(
  url: string,
  options: { maxItems?: number; titlePrefix?: string } = {}
): Promise<ScrapedWork[]> {
  const html = await fetchHtml(url);
  const pageId =
    html.match(/"page_id"\s*:\s*"?(\d+)"?/)?.[1] ||
    html.match(/page_id=(\d+)/)?.[1] ||
    "";

  if (!pageId) return [];

  const origin = new URL(url).origin;
  const res = await fetch(`${origin}/_api/v0/page/${pageId}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
    cache: "no-store",
  });

  if (!res.ok) return [];

  const data = await res.json();
  const images: CargoImage[] = Array.isArray(data?.images) ? data.images : [];
  const items: ScrapedWork[] = [];

  for (const image of images) {
    if (items.length >= (options.maxItems || 12)) break;
    if (!image.hash || !image.name) continue;
    if ((image.width || 0) < 400 || (image.height || 0) < 300) continue;

    const imageUrl = `https://freight.cargo.site/t/original/i/${image.hash}/${image.name}`;
    const fallbackNumber = items.length + 1;
    const fileTitle = humanizeSlug(image.name).replace(/^\d+\s*/, "");
    const title =
      !fileTitle || /^work\s*\d*$/i.test(fileTitle) || /^\d+$/.test(fileTitle)
        ? `${options.titlePrefix || "Work"} ${fallbackNumber}`
        : fileTitle;

    items.push({
      title: title.length < 3 ? `${options.titlePrefix || "Work"} ${fallbackNumber}` : title,
      workUrl: appendSyntheticItem(url, image.id || image.hash),
      thumbnailUrl: improveImageUrlQuality(imageUrl),
    });
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

  if (merged.size < 12) {
    for (const candidate of candidates) {
      let embeddedItems: ScrapedWork[] = [];
      try {
        embeddedItems = await scrapeEmbeddedWorkFeed(candidate, { maxItems: 12 });
      } catch {
        embeddedItems = [];
      }

      for (const item of embeddedItems) {
        const key = normalizeUrl(item.workUrl).toLowerCase();
        if (!merged.has(key)) merged.set(key, item);
      }

      if (merged.size >= 12) break;
    }
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
    if (!/\/work\/[^/?#]+/.test(href)) return;

    const workUrl = normalizeUrl(toAbsolute(url, href));

    // 提取标题
    let title = $card.find("h2, h3, .title, [class*='title']").first().text().trim();
    if (!title) {
      title = $link.attr("title") || $link.text().trim();
    }

    if (!title || IGNORE_TITLES.has(title.toLowerCase())) return;

    const thumbnailUrl = extractMediaOrPlaceholder($, url, $card, workUrl);

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

    const thumbnailUrl = extractMediaOrPlaceholder($, workListUrl, $link, workUrl);

    seen.add(key);
    items.push({
      title,
      workUrl,
      thumbnailUrl,
    });
  });

  return items.slice(0, 24);
}

function decodeEscapedNextData(html: string) {
  return html.replace(/\\"/g, '"').replace(/\\u0026/g, "&");
}

function extractEmbeddedThumbnail(block: string) {
  const patterns = [
    /"landscapeThumbnail":\{"_type":"image"[\s\S]*?"url":"(https:\/\/cdn\.sanity\.io[^"]+)/,
    /"mediumThumbnail":\{"_type":"image"[\s\S]*?"url":"(https:\/\/cdn\.sanity\.io[^"]+)/,
    /"heroLandscape":\{"_type":"image"[\s\S]*?"url":"(https:\/\/cdn\.sanity\.io[^"]+)/,
    /"squareThumbnail":[\s\S]*?"url":"(https:\/\/cdn\.sanity\.io[^"]+)/,
    /"thumbnail":[\s\S]*?"url":"(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp|gif|avif)(?:\?[^"]*)?)/,
    /"image":[\s\S]*?"url":"(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp|gif|avif)(?:\?[^"]*)?)/,
    /"cover":[\s\S]*?"url":"(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp|gif|avif)(?:\?[^"]*)?)/,
    /"url":"(https:\/\/cdn\.sanity\.io[^"]+)/,
  ];

  for (const pattern of patterns) {
    const match = block.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

async function scrapeEmbeddedWorkFeed(
  url: string,
  options: {
    listPath?: string;
    maxItems?: number;
    hrefPattern?: RegExp;
  } = {}
): Promise<ScrapedWork[]> {
  const workListUrl = options.listPath ? toAbsolute(url, options.listPath) : url;
  const html = await fetchHtml(workListUrl);
  const data = decodeEscapedNextData(html);
  const feedStart = data.indexOf('"feed":[{"_key"');
  const source = feedStart >= 0 ? data.slice(feedStart) : data;
  const hrefPattern =
    options.hrefPattern ||
    /\/(?:projects|project|work|works|case-studies|case|clients)\/[^"]+/;
  const matches = [
    ...source.matchAll(
      /"title":"([^"]+)"[\s\S]{0,360}?"link":"([^"]+)"/g
    ),
  ];
  const items: ScrapedWork[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const title = (match[1] || "").trim();
    const href = match[2] || "";
    if (!hrefPattern.test(href)) continue;
    if (!title || !href || IGNORE_TITLES.has(title.toLowerCase())) continue;

    const workUrl = normalizeUrl(toAbsolute(workListUrl, href));
    const key = workUrl.toLowerCase();
    if (seen.has(key)) continue;

    const start = match.index || 0;
    const end = matches[i + 1]?.index || start + 5000;
    const block = source.slice(start, Math.min(end, start + 5000));
    const thumbnailUrl =
      firstUsableMediaUrl(workListUrl, [extractEmbeddedThumbnail(block)]) ||
      placeholderImage(workUrl);

    seen.add(key);
    items.push({
      title,
      workUrl,
      thumbnailUrl,
    });

    if (items.length >= (options.maxItems || 24)) break;
  }

  return items;
}

async function scrapeKoto(url: string): Promise<ScrapedWork[]> {
  return scrapeEmbeddedWorkFeed(url, {
    listPath: "/work",
    maxItems: 24,
    hrefPattern: /^\/projects\/[^/?#]+/,
  });
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

    const $card = $link.closest("[data-card-client-landing], li");
    const $mediaRoot = $card.length ? $card : $link;
    const thumbnailUrl = extractMediaOrPlaceholder($, url, $mediaRoot, workUrl);

    seen.add(key);
    items.push({ title, workUrl, thumbnailUrl });
  });

  return items.slice(0, 12);
}

async function scrapeCollins(url: string): Promise<ScrapedWork[]> {
  const caseStudiesUrl = toAbsolute(url, "/case-studies");
  const html = await fetchHtml(caseStudiesUrl);
  const $ = load(html);
  const items: ScrapedWork[] = [];
  const seen = new Set<string>();

  $(".overview .shelf > .card, .shelf > .card").each((_, el) => {
    const $card = $(el);
    const $link = $card
      .find(
        'a[href^="/case-studies/"], a[href*="wearecollins.com/case-studies/"]'
      )
      .first();
    const href = $link.attr("href") || "";
    if (!href || /\/case-studies\/?$/.test(href)) return;

    const workUrl = normalizeUrl(toAbsolute(caseStudiesUrl, href));
    const key = workUrl.toLowerCase();
    if (seen.has(key)) return;

    let title =
      $link.attr("aria-label") ||
      $link.attr("title") ||
      $link.find("span,h1,h2,h3,h4").first().text().trim() ||
      $link.text().replace(/\s+/g, " ").trim();

    if (!title) {
      const slug = href.split("/").filter(Boolean).pop() || "";
      title = slug
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
    }
    if (!title || title.length < 2 || IGNORE_TITLES.has(title.toLowerCase())) {
      return;
    }

    const thumbnailUrl = extractMediaOrPlaceholder($, caseStudiesUrl, $card, workUrl);

    seen.add(key);
    items.push({ title, workUrl, thumbnailUrl });
  });

  return items.slice(0, 24);
}

async function scrapeByUrl(url: string): Promise<ScrapedWork[]> {
  // 优先使用专门的抓取逻辑
  if (url.includes("ablackcover.com")) {
    return scrapeCargoSitemap(url, {
      maxItems: 24,
      skipSlugs: ["index", "info", "portfolio"],
    });
  }
  if (url.includes("wangzhihong.com")) {
    return scrapeCargoPageImages(url, { maxItems: 12, titlePrefix: "Wang Zhihong" });
  }
  if (url.includes("u-d-l.com")) return scrapeUDL(url);
  if (url.includes("ki-gi.com")) return scrapeKIGI();
  if (url.includes("ndc.co.jp")) return scrapeNDC(url);
  if (url.includes("portorocha.com")) return scrapePortoRocha(url);
  if (url.includes("pentagram.com")) return scrapePentagram(url);
  if (url.includes("stockholmdesignlab.se")) return scrapeSDL(url);
  if (url.includes("koto.com")) return scrapeKoto(url);
  if (url.includes("area17.com")) return scrapeArea17(url);
  if (url.includes("wearecollins.com")) return scrapeCollins(url);

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
        isUsableMediaUrl(item.thumbnailUrl)
          ? item.thumbnailUrl
          : null;
      const needsUpdate =
        !currentThumb ||
        !isUsableMediaUrl(currentThumb) ||
        (scrapedThumb != null && scrapedThumb !== currentThumb);
      if (!needsUpdate) continue;

      const ogImage = scrapedThumb ? null : await extractBestMedia(item.workUrl);
      const nextThumb = scrapedThumb || ogImage;

      if (nextThumb) {
        thumbnailUpdates.push({ id: existingWork.id, thumbnail_url: nextThumb });
        studioDebug.updated++;
      }
      continue;
    }

    const scrapedThumb =
      isUsableMediaUrl(item.thumbnailUrl) ? item.thumbnailUrl : null;
    const ogImage = scrapedThumb ? null : await extractBestMedia(item.workUrl);
    const thumb =
      scrapedThumb ||
      (isUsableMediaUrl(ogImage) ? ogImage : null) ||
      placeholderImage(item.workUrl);
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
