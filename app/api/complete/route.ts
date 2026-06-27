import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { checkWin as sudokuCheckWin } from "@/lib/games/sudoku";
import { checkWin as nonogramCheckWin } from "@/lib/games/nonogram";
import { todayUTC } from "@/lib/daily";
import { NextResponse } from "next/server";

const MIN_SECONDS = 10; // sub-human floor

export async function POST(request: Request) {
  const body = await request.json();
  const { game, clientSeconds, submission, assisted } = body as {
    game: string;
    clientSeconds: number;
    submission: unknown;
    assisted: boolean;
  };

  if (clientSeconds < MIN_SECONDS) {
    return NextResponse.json({ error: "Invalid time" }, { status: 400 });
  }

  // Load puzzle + solution via service role (solution never goes to client)
  const service = createServiceClient();
  const { data: puzzle, error } = await service
    .from("puzzles")
    .select("id, game, play_date, solution")
    .eq("game", game)
    .eq("play_date", todayUTC())
    .single();

  if (error || !puzzle) {
    return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
  }

  // Validate submission
  const valid = validateSubmission(game, submission, puzzle.solution);
  if (!valid) {
    return NextResponse.json({ error: "Incorrect solution" }, { status: 400 });
  }

  // Auth client for RPC (runs as the authenticated user)
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    // Guest mode: just return success, no persistence
    return NextResponse.json({ streak: 0, best: null, rank: null });
  }

  const isToday = puzzle.play_date === todayUTC();

  if (isToday) {
    // record_solve handles progress + streak + best atomically
    const { data: stats, error: rpcError } = await userClient.rpc(
      "record_solve",
      {
        p_puzzle_id: puzzle.id,
        p_seconds: clientSeconds,
        p_assisted: assisted ?? false,
      }
    );

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    // PostgREST wraps composite-type returns in an array even for single-row functions
    const statsRow = Array.isArray(stats) ? stats[0] : stats;

    return NextResponse.json({
      streak: statsRow?.current_streak ?? 0,
      best: statsRow?.best_seconds ?? null,
      rank: null,
    });
  } else {
    // Archive solve: record progress only, no streak/best update
    await userClient.from("progress").upsert({
      user_id: user.id,
      puzzle_id: puzzle.id,
      status: "solved",
      duration_seconds: clientSeconds,
      completed_at: new Date().toISOString(),
      assisted: assisted ?? false,
    });

    return NextResponse.json({ streak: null, best: null, rank: null });
  }
}

function validateSubmission(
  game: string,
  submission: unknown,
  solution: unknown
): boolean {
  const sol = solution as Record<string, string>;

  if (game === "sudoku") {
    if (!Array.isArray(submission)) return false;
    const answer = typeof solution === "string" ? solution : sol?.answer;
    if (!answer) return false;
    return sudokuCheckWin(submission as number[], answer);
  }

  if (game === "nonogram" || game === "nonomini") {
    if (!Array.isArray(submission)) return false;
    if (!sol?.answer) return false;
    return nonogramCheckWin(submission as number[], sol.answer);
  }

  return false;
}
