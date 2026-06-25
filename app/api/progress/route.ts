import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: true }); // Guest: ignore
  }

  const { puzzle_id, board } = await request.json();

  const { error } = await supabase.from("progress").upsert({
    user_id: user.id,
    puzzle_id,
    board,
    status: "in_progress",
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
