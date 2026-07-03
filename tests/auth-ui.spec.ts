import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("https://picsum.photos/**", (route) => route.abort());
});

test("错误账号密码会显示安全的登录错误", async ({ page }) => {
  await page.route("**/auth/v1/token?grant_type=password", async (route) => {
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        code: "invalid_credentials",
        msg: "Invalid login credentials",
      }),
    });
  });
  await page.goto("/login");

  const email = page.getByPlaceholder("请输入邮箱地址");
  const password = page.locator('input[name="studio-feed-passcode"]');
  await email.click();
  await email.fill("nobody@example.com");
  await password.click();
  await password.fill("wrong-password");
  await page.getByRole("button", { name: "登录" }).click();

  await expect(page.getByText("Invalid login credentials")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("找回密码始终展示不泄露账号存在性的提示", async ({ page }) => {
  await page.route("**/auth/v1/recover", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "{}",
    });
  });
  await page.goto("/forgot-password");

  await page.getByPlaceholder("邮箱").fill("unknown@example.com");
  await page.getByRole("button", { name: "发送重置邮件" }).click();

  await expect(
    page.getByText("如果该邮箱已注册，密码重置邮件将发送到你的邮箱。")
  ).toBeVisible();
});

test("注册接口错误会显示给用户且不会误报成功", async ({ page }) => {
  await page.route("**/auth/v1/signup**", async (route) => {
    await route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({
        code: "weak_password",
        msg: "Password should contain more characters",
      }),
    });
  });
  await page.goto("/signup");

  await page.locator('input[type="email"]').fill("new-user@example.com");
  await page.locator('input[type="password"]').fill("12345678");
  await page.getByRole("button", { name: "注册" }).click();

  await expect(
    page.getByText("Password should contain more characters")
  ).toBeVisible();
});
