# StudioFeed

一个支持多用户登录、独立工作室列表和作品抓取的 Next.js + Supabase 平台。

## 本地启动

1. 复制 `.env.example` 为 `.env.local`，填写 Supabase 配置。
2. 运行 `npm install`。
3. 运行 `npm run dev`。
4. 打开 `http://localhost:3000`。

成功标志：登录页可以打开，终端显示 `Ready`。

## 多用户数据库迁移

迁移文件：`supabase/migrations/202606290001_multi_tenant.sql`

风险：迁移会修改线上表结构、数据归属、RLS 和 Storage 权限。运行前必须备份数据库。旧数据只有在 `auth.users` 恰好存在一个账号时才会自动归属；否则迁移会停止，避免误分数据。

操作步骤：

1. 在 Supabase 创建数据库备份。
2. 先在测试项目的 SQL Editor 执行迁移文件。
3. 用两个测试账号验证互相看不到对方数据。
4. 确认无误后再在正式项目执行。

成功标志：`studios.owner_id` 不为空；用户只能查询自己的 `studios` 和 `works`；第 51 家工作室插入失败。

## Supabase Auth 配置

1. 开启 Email + Password。
2. 开启 Confirm email。
3. 将本地和正式域名加入 Redirect URLs：
   - `http://localhost:3000/auth/callback`
   - `https://你的域名/auth/callback`

成功标志：注册后收到验证邮件，点击后进入 `/welcome`。

## Vercel 环境变量

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`：仅服务端使用，严禁添加 `NEXT_PUBLIC_` 前缀。
- `CRON_SECRET`：使用足够长的随机字符串。

`vercel.json` 每天 UTC 02:17 调用刷新接口。Vercel 会使用 `CRON_SECRET` 生成 Authorization 请求头。

成功标志：无密钥访问 `GET /api/refresh-works` 返回 401；Vercel Cron 日志显示每天一次 200 响应。

## 检查

```bash
npm run lint
npm run build
```

两条命令都无报错即表示代码检查通过。
