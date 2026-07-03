import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("https://picsum.photos/**", (route) => route.abort());
});

test.describe("公开页面与登录入口", () => {
  test("未登录首页展示产品介绍和登录入口", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle("StudioFeed");
    await expect(
      page.getByRole("heading", { name: "你的设计灵感工作台" })
    ).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("link", { name: "登录" })
    ).toHaveAttribute("href", "/login");
  });

  test("登录页提供登录、注册和找回密码入口", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("heading", { name: "欢迎回来" })
    ).toBeVisible();
    await expect(page.getByPlaceholder("请输入邮箱地址")).toBeVisible();
    await expect(page.locator('input[name="studio-feed-passcode"]')).toBeVisible();
    await expect(page.getByRole("link", { name: "忘记密码" })).toHaveAttribute(
      "href",
      "/forgot-password"
    );
    await expect(page.getByRole("link", { name: "创建账号" })).toHaveAttribute(
      "href",
      "/signup"
    );
  });

  test("登录页可以切换密码显示状态", async ({ page }) => {
    await page.goto("/login");
    const password = page.locator('input[name="studio-feed-passcode"]');

    await password.click();
    await password.fill("example-password");
    await expect(password).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "显示密码" }).click();
    await expect(password).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "隐藏密码" }).click();
    await expect(password).toHaveAttribute("type", "password");
  });

  test("注册页要求至少 8 位密码", async ({ page }) => {
    await page.goto("/signup");
    const password = page.locator('input[type="password"]');

    await password.fill("1234567");
    const isValid = await password.evaluate(
      (element: HTMLInputElement) => element.checkValidity()
    );

    expect(isValid).toBe(false);
    await expect(
      page.getByRole("button", { name: "注册" })
    ).toBeVisible();
  });

  test("找回密码页包含邮箱输入和返回登录入口", async ({ page }) => {
    await page.goto("/forgot-password");

    await expect(
      page.getByRole("heading", { name: "找回密码" })
    ).toBeVisible();
    await expect(page.getByPlaceholder("邮箱")).toBeVisible();
    await expect(page.getByRole("link", { name: "返回登录" })).toHaveAttribute(
      "href",
      "/login"
    );
  });

  test("关于和联系页面可以访问", async ({ page }) => {
    await page.goto("/about");
    await expect(
      page.getByRole("heading", { name: "关于这个项目" })
    ).toBeVisible();

    await page.goto("/contact");
    await expect(page.getByRole("heading", { name: "联系" })).toBeVisible();
  });
});

test.describe("未登录页面保护", () => {
  for (const path of [
    "/admin/studios",
    "/admin/works",
    "/admin/profile",
    "/welcome",
  ]) {
    test(`${path} 会跳转到登录页`, async ({ page }) => {
      await page.goto(path);

      await expect(page).toHaveURL(/\/login$/);
      await expect(
        page.getByRole("heading", { name: "欢迎回来" })
      ).toBeVisible();
    });
  }
});
