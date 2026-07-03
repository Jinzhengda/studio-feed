import { expect, Page, test } from "@playwright/test";

const userA = {
  email: process.env.E2E_USER_A_EMAIL || "",
  password: process.env.E2E_USER_A_PASSWORD || "",
};
const userB = {
  email: process.env.E2E_USER_B_EMAIL || "",
  password: process.env.E2E_USER_B_PASSWORD || "",
};
const hasTwoUsers = Boolean(
  userA.email && userA.password && userB.email && userB.password
);

test.beforeEach(async ({ page }) => {
  await page.route("https://picsum.photos/**", (route) => route.abort());
});

async function login(page: Page, user: typeof userA) {
  await page.route("https://picsum.photos/**", (route) => route.abort());
  await page.goto("/login");
  const email = page.getByPlaceholder("请输入邮箱地址");
  const password = page.locator('input[name="studio-feed-passcode"]');
  await email.click();
  await email.fill(user.email);
  await password.click();
  await password.fill(user.password);
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL("/");
}

test.describe("真实双账号数据隔离", () => {
  test.skip(
    !hasTwoUsers,
    "需要在本机环境变量中配置两组专用 E2E 测试账号"
  );
  test.describe.configure({ mode: "serial" });

  test("两个账号都能独立登录", async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    await login(pageA, userA);
    await login(pageB, userB);
    await expect(pageA.getByPlaceholder("搜索作品或工作室")).toBeVisible();
    await expect(pageB.getByPlaceholder("搜索作品或工作室")).toBeVisible();

    await contextA.close();
    await contextB.close();
  });

  test("账号 A 新增的数据不会出现在账号 B，B 也不能修改或删除它", async ({
    browser,
  }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    await login(pageA, userA);
    await login(pageB, userB);

    const uniqueName = `E2E Isolation ${Date.now()}`;
    let studioId = "";

    try {
      const createResponse = await pageA.request.post("/api/studios", {
        data: {
          name: uniqueName,
          website_url: "https://example.com",
          feed_url: "https://example.com/e2e-work",
          location: "Test",
          tags: "e2e",
          is_active: false,
        },
      });
      expect(createResponse.status()).toBe(201);
      const createBody = await createResponse.json();
      studioId = createBody.studio.id;

      const listA = await pageA.request.get("/api/studios");
      const listB = await pageB.request.get("/api/studios");
      expect((await listA.json()).studios).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: uniqueName })])
      );
      expect((await listB.json()).studios).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ name: uniqueName })])
      );

      const patchAsB = await pageB.request.patch(`/api/studios/${studioId}`, {
        data: {
          name: "Hijacked",
          feed_url: "https://example.com/hijacked",
        },
      });
      expect(patchAsB.ok()).toBe(false);

      const deleteAsB = await pageB.request.delete(`/api/studios/${studioId}`);
      expect(deleteAsB.ok()).toBe(true);
      const afterAttempt = await pageA.request.get("/api/studios");
      expect((await afterAttempt.json()).studios).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: uniqueName })])
      );
    } finally {
      if (studioId) {
        await pageA.request.delete(`/api/studios/${studioId}`);
      }
      await contextA.close();
      await contextB.close();
    }
  });

  test("登录用户新增工作室时仍会拒绝内网地址", async ({ page }) => {
    await login(page, userA);
    const response = await page.request.post("/api/studios", {
      data: {
        name: "E2E SSRF",
        feed_url: "http://169.254.169.254/latest/meta-data",
      },
    });

    expect(response.status()).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "不能使用本机、内网或云服务内部地址",
    });
  });

  test("指定为空账号时，首页显示空状态", async ({ page }) => {
    test.skip(
      process.env.E2E_USER_B_EXPECT_EMPTY !== "1",
      "仅在账号 B 是专用空账号时执行"
    );
    await login(page, userB);

    await expect(
      page.getByRole("heading", { name: "你的作品流还是空的" })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "添加工作室" })).toHaveAttribute(
      "href",
      "/admin/studios?new=1"
    );
  });

  test("10 分钟内重复手动刷新会被限流", async ({ page }) => {
    test.skip(
      process.env.E2E_ENABLE_REFRESH_TEST !== "1",
      "刷新会写入限流状态，默认不执行"
    );
    await login(page, userB);

    const first = await page.request.post("/api/refresh-works");
    const second = await page.request.post("/api/refresh-works");

    expect(first.status()).toBe(200);
    expect(second.status()).toBe(429);
  });
});
