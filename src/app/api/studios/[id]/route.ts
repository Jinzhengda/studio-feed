import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { studioPayload } from "@/lib/studio-validation";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  try {
    const { id } = await context.params;
    const payload = studioPayload(await request.json());
    const { data, error } = await supabase
      .from("studios")
      .update(payload)
      .eq("id", id)
      .eq("owner_id", user.id)
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ studio: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新失败" },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: Request, context: Context) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { id } = await context.params;
  const { error } = await supabase
    .from("studios")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);
  return error
    ? NextResponse.json({ error: error.message }, { status: 400 })
    : NextResponse.json({ ok: true });
}
