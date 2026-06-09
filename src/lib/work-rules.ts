type WorkLike = {
  thumbnail_url?: string | null;
  work_url?: string | null;
};

const SKIP_LINK_PATH_PARTS = [
  "/discipline/",
  "/sector/",
  "/category/",
  "/categories/",
  "/tag/",
  "/tags/",
  "/type/",
  "/types/",
  "/filter/",
  "/filters/",
];

export function isSkippableWorkUrl(input: string | null | undefined) {
  if (!input) return true;

  const lowerInput = input.toLowerCase();
  if (
    lowerInput.includes("/about") ||
    lowerInput.includes("/contact") ||
    lowerInput.includes("/team") ||
    lowerInput.includes("/news")
  ) {
    return true;
  }

  try {
    const url = new URL(input, "https://studiofeed.local");
    const path = url.pathname.toLowerCase();

    if (
      url.hostname.includes("moshi-moshi.jp") &&
      !/^\/(?:en\/)?work\/post_\d+\/?$/.test(path)
    ) {
      return true;
    }

    return SKIP_LINK_PATH_PARTS.some((part) => path.includes(part));
  } catch {
    return SKIP_LINK_PATH_PARTS.some((part) => lowerInput.includes(part));
  }
}

export function isUsableWorkThumbnail(input: string | null | undefined) {
  if (!input) return false;

  const lowerInput = input.toLowerCase();
  if (lowerInput.startsWith("data:image/svg+xml")) return false;
  if (lowerInput.includes("weareink.co.uk/assets/img/share-square.png")) {
    return false;
  }
  if (lowerInput.includes("moshi-moshi.jp/cms/wp-content/uploads/2020/09/og-image.jpg")) {
    return false;
  }

  return true;
}

export function extractDateFromMediaVersion(input: string | null | undefined) {
  if (!input) return null;

  try {
    const version = new URL(input).searchParams.get("v");
    if (!version || !/^\d{10}$/.test(version)) return null;

    const date = new Date(Number(version) * 1000);
    const min = new Date("2018-01-01T00:00:00Z");
    const max = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    if (date < min || date > max) return null;

    return date.toISOString();
  } catch {
    return null;
  }
}

export function shouldPreferCaptureDate(workUrl: string | null | undefined) {
  if (!workUrl) return false;

  try {
    const url = new URL(workUrl);
    return url.hostname.includes("weareink.co.uk");
  } catch {
    return workUrl.toLowerCase().includes("weareink.co.uk");
  }
}

export function shouldDisplayWork(work: WorkLike) {
  return (
    !isSkippableWorkUrl(work.work_url) &&
    isUsableWorkThumbnail(work.thumbnail_url)
  );
}
