import { expect, test } from "@playwright/test";
import {
  studioPayload,
  validatePublicUrl,
} from "../src/lib/studio-validation";

test.describe("工作室输入与 SSRF 防护", () => {
  test("接受公开 HTTP/HTTPS 地址并移除凭据和锚点", () => {
    expect(validatePublicUrl("https://user:pass@example.com/work#section")).toBe(
      "https://example.com/work"
    );
    expect(validatePublicUrl("http://example.com")).toBe("http://example.com/");
  });

  for (const value of [
    "http://localhost:3000",
    "http://127.0.0.1",
    "http://10.0.0.1",
    "http://172.16.0.1",
    "http://192.168.1.1",
    "http://169.254.169.254/latest/meta-data",
    "http://metadata.google.internal",
    "http://service.internal",
    "http://printer.local",
    "http://[::1]",
    "http://[fd00::1]",
    "http://[fe80::1]",
  ]) {
    test(`拒绝私有或内部地址：${value}`, () => {
      expect(() => validatePublicUrl(value, true)).toThrow(
        "不能使用本机、内网或云服务内部地址"
      );
    });
  }

  test("拒绝非 HTTP 协议和缺失的抓取地址", () => {
    expect(() => validatePublicUrl("file:///etc/passwd", true)).toThrow(
      "只支持 HTTP 或 HTTPS 地址"
    );
    expect(() =>
      studioPayload({ name: "Studio", feed_url: "" })
    ).toThrow("请填写网站地址");
  });

  test("规范化合法工作室数据", () => {
    expect(
      studioPayload({
        name: "  Example Studio  ",
        website_url: "https://example.com",
        feed_url: "https://example.com/work",
        location: "  Shanghai  ",
        tags: " branding, digital ",
        is_active: false,
      })
    ).toMatchObject({
      name: "Example Studio",
      website_url: "https://example.com/",
      feed_url: "https://example.com/work",
      location: "Shanghai",
      tags: "branding, digital",
      is_active: false,
    });
  });

  test("拒绝空名称和超过 120 字符的名称", () => {
    expect(() =>
      studioPayload({ name: "", feed_url: "https://example.com" })
    ).toThrow("工作室名称需为 1–120 个字符");
    expect(() =>
      studioPayload({
        name: "x".repeat(121),
        feed_url: "https://example.com",
      })
    ).toThrow("工作室名称需为 1–120 个字符");
  });
});
