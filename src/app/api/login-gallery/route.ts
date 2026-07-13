import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  LOGIN_GALLERY_BUCKET,
  loginGalleryAssets,
  loginGalleryObjectPath,
} from "@/lib/login-gallery";

export const revalidate = 3600;

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.json({ images: [] }, { status: 503 });
  }

  const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const images = loginGalleryAssets.map((asset) => {
    const path = loginGalleryObjectPath(asset.objectName);
    const { data } = supabase.storage
      .from(LOGIN_GALLERY_BUCKET)
      .getPublicUrl(path);

    return {
      id: asset.objectName,
      title: asset.title,
      thumbnail_url: data.publicUrl,
    };
  });

  return NextResponse.json(
    { images },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
