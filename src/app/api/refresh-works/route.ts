import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();

  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: studios, error } = await supabase
    .from("studios")
    .select("id,name")
    .eq("is_active", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!studios || studios.length === 0) {
    return NextResponse.json({ inserted: 0 });
  }

  const now = new Date().toISOString();

  const sizes: Array<[number, number]> = [
    [800, 520],
    [800, 1000],
    [800, 640],
    [800, 900],
    [800, 480],
    [800, 1100],
  ];

  const rows = studios.flatMap((studio) =>
    Array.from({ length: 4 }).map((_, k) => {
      const [w, h] = sizes[k % sizes.length];
      return {
        studio_id: studio.id,
        title: `${studio.name} Demo Work ${k + 1}`,
        thumbnail_url: `https://picsum.photos/seed/${studio.id}-${k}/${w}/${h}`,
        work_url: "#",
        published_at: now,
        is_visible: true,
      };
    })
  );

  const { error: insertError } = await supabase.from("works").insert(rows);

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ inserted: rows.length });
}
