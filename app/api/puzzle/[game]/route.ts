import { createServiceClient } from "@/lib/supabase/service";
import { todayUTC } from "@/lib/daily";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ game: string }> }
) {
  const { game } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("puzzles")
    .select("id, game, play_date, difficulty, data")
    .eq("game", game)
    .eq("play_date", todayUTC())
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "No puzzle found for today" },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}
