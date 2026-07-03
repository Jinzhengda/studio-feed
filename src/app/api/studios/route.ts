import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { studioPayload } from "@/lib/studio-validation";

async function currentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await currentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { data, error } = await supabase
    .from("studios")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return error
    ? NextResponse.json({ error: error.message }, { status: 500 })
    : NextResponse.json({ studios: data || [] });
}

export async function POST(request: Request) {
  const { supabase, user } = await currentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  try {
    const payload = studioPayload(await request.json());
    const { count } = await supabase
      .from("studios")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id);
    if ((count || 0) >= 50) {
      return NextResponse.json({ error: "每个账号最多添加 50 家工作室" }, { status: 409 });
    }

    const { data, error } = await supabase
      .from("studios")
      .insert({ ...payload, owner_id: user.id })
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ studio: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "新增失败" },
      { status: 400 }
    );
  }
}
