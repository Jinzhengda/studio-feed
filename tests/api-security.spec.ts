import { expect, test } from "@playwright/test";

test.describe("未登录 API 权限", () => {
  test("工作室列表拒绝未登录请求", async ({ request }) => {
    const response = await request.get("/api/studios");

    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: "请先登录" });
  });

  test("新增工作室拒绝未登录请求", async ({ request }) => {
    const response = await request.post("/api/studios", {
      data: {
        name: "Unauthorized Studio",
        feed_url: "https://example.com/work",
      },
    });

    expect(response.status()).toBe(401);
  });

  test("修改和删除工作室拒绝未登录请求", async ({ request }) => {
    const id = "00000000-0000-0000-0000-000000000000";
    const patchResponse = await request.patch(`/api/studios/${id}`, {
      data: {
        name: "Unauthorized Studio",
        feed_url: "https://example.com/work",
      },
    });
    const deleteResponse = await request.delete(`/api/studios/${id}`);

    expect(patchResponse.status()).toBe(401);
    expect(deleteResponse.status()).toBe(401);
  });

  test("作品分页接口拒绝未登录请求", async ({ request }) => {
    const response = await request.get("/api/works?page=0&limit=20");

    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "Unauthorized",
    });
  });

  test("手动刷新拒绝未登录请求", async ({ request }) => {
    const response = await request.post("/api/refresh-works");

    expect(response.status()).toBe(401);
  });
});

test.describe("定时任务和媒体代理安全", () => {
  test("Cron 接口没有密钥或密钥错误时返回 401", async ({ request }) => {
    const missing = await request.get("/api/refresh-works");
    const incorrect = await request.get("/api/refresh-works", {
      headers: { authorization: "Bearer definitely-wrong" },
    });

    expect(missing.status()).toBe(401);
    expect(incorrect.status()).toBe(401);
  });

  test("媒体代理拒绝缺失、非法协议和未授权域名", async ({ request }) => {
    const toHex = (value: string) =>
      Array.from(new TextEncoder().encode(value), (byte) =>
        byte.toString(16).padStart(2, "0")
      ).join("");

    const missing = await request.get("/api/media");
    const unsupported = await request.get(
      `/api/media?src=${toHex("file:///etc/passwd")}`
    );
    const forbiddenHost = await request.get(
      `/api/media?src=${toHex("https://example.com/image.jpg")}`
    );

    expect(missing.status()).toBe(400);
    expect(unsupported.status()).toBe(400);
    expect(forbiddenHost.status()).toBe(400);
  });
});
