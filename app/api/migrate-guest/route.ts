import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

interface GuestEntry {
  status: string;
  duration_seconds: number | null;
}

export async function POST(req: Request) {
  const { date, progress } = await req.json() as {
    date: string;
    progress: Record<string, GuestEntry>;
  };

  if (!date || typeof progress !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Service role needed to read puzzles (no client RLS policy on that table)
  const service = createServiceClient();
  const { data: puzzles } = await service
    .from("puzzles")
    .select("id, game")
    .eq("play_date", date);

  if (!puzzles?.length) return NextResponse.json({ ok: true });

  for (const [game, prog] of Object.entries(progress)) {
    const puzzle = puzzles.find((p) => p.game === game);
    if (!puzzle) continue;

    // Don't downgrade a solved record
    const { data: existing } = await userClient
      .from("progress")
      .select("status")
      .eq("puzzle_id", puzzle.id)
      .maybeSingle();
    if (existing?.status === "solved") continue;

    await userClient.from("progress").upsert(
      {
        user_id: user.id,
        puzzle_id: puzzle.id,
        status: prog.status === "solved" ? "solved" : "in_progress",
        duration_seconds: prog.duration_seconds ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,puzzle_id" },
    );
  }

  return NextResponse.json({ ok: true });
}
