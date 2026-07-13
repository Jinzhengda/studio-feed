import { readFile } from "node:fs/promises";
import { join } from "node:path";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const sourceDirectory = process.argv[2];
if (!sourceDirectory) {
  throw new Error("请提供图片文件夹地址");
}

const assets = [
  ["Dream and Lie of Franco I.webp", "dream-and-lie-of-franco-i.webp"],
  ["Flowers.webp", "flowers.webp"],
  ["Lid. Flowers and scroll. Made of gilded and enamel (champleve) cloison.webp", "lid-flowers-and-scroll.webp"],
  ["No.19 Ejiri.webp", "no-19-ejiri.webp"],
  ["Profile Portrait of a Boy.webp", "profile-portrait-of-a-boy.webp"],
  ["Shepherdess and Sheep.webp", "shepherdess-and-sheep.webp"],
  ["Still Life with Aubergines.webp", "still-life-with-aubergines.webp"],
  ["Still Life with Pineapple.webp", "still-life-with-pineapple.webp"],
  ["The Red Studio.webp", "the-red-studio.webp"],
  ["Untitled.webp", "untitled.webp"],
];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  throw new Error("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

for (const [fileName, objectName] of assets) {
  const bytes = await readFile(join(sourceDirectory, fileName));
  const path = `login-gallery/v1/${objectName}`;
  const { error } = await supabase.storage.from("studio-covers").upload(path, bytes, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });

  if (error && !/already exists|duplicate/i.test(error.message)) {
    throw new Error(`${fileName}: ${error.message}`);
  }

  console.log(`${error ? "已存在" : "已上传"}: ${path}`);
}
