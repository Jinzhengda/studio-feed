import { isIP } from "node:net";

const PRIVATE_HOSTS = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.google.com",
]);

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return false;
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function isPrivateIpv6(hostname: string) {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  );
}

export function validatePublicUrl(value: unknown, required = false) {
  if (value == null || value === "") {
    if (required) throw new Error("请填写网站地址");
    return null;
  }
  if (typeof value !== "string" || value.length > 2048) {
    throw new Error("网站地址格式不正确");
  }

  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("请输入完整的 http:// 或 https:// 地址");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("只支持 HTTP 或 HTTPS 地址");
  }

  const parsedHostname = url.hostname.toLowerCase().replace(/\.$/, "");
  const hostname =
    parsedHostname.startsWith("[") && parsedHostname.endsWith("]")
      ? parsedHostname.slice(1, -1)
      : parsedHostname;
  if (
    PRIVATE_HOSTS.has(hostname) ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    isPrivateIpv4(hostname) ||
    (isIP(hostname) === 6 && isPrivateIpv6(hostname))
  ) {
    throw new Error("不能使用本机、内网或云服务内部地址");
  }

  url.username = "";
  url.password = "";
  url.hash = "";
  return url.toString();
}

export function studioPayload(input: unknown) {
  const body = (input || {}) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 120) throw new Error("工作室名称需为 1–120 个字符");

  const text = (value: unknown, max: number) =>
    typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;

  return {
    name,
    website_url: validatePublicUrl(body.website_url),
    feed_url: validatePublicUrl(body.feed_url, true),
    cover_url: validatePublicUrl(body.cover_url),
    location: text(body.location, 120),
    tags: text(body.tags, 300),
    is_active: body.is_active !== false,
  };
}
