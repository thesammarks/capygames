import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { GAMES, RULES } from "@/lib/rules";
import { todayUTC, dailyNumber } from "@/lib/daily";
import { notFound } from "next/navigation";
import GamePage from "./GamePage";

interface Props {
  params: Promise<{ game: string }>;
}

export default async function PlayPage({ params }: Props) {
  const { game } = await params;

  const gameMeta = GAMES.find((g) => g.id === game);
  if (!gameMeta) notFound();

  const service = createServiceClient();
  const today = todayUTC();

  // Fetch puzzle (solution only passed to client when already solved)
  const { data: puzzle } = await service
    .from("puzzles")
    .select("id, data, play_date, solution")
    .eq("game", game)
    .eq("play_date", today)
    .single();

  if (!puzzle) {
    return (
      <main style={{ padding: "2rem", textAlign: "center", fontFamily: "var(--kaku)" }}>
        <p>No puzzle for today yet. Check back soon!</p>
      </main>
    );
  }

  // Fetch user stats for streak/best display
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  const isAuthenticated = !!user;

  let streak = 0;
  let bestSeconds: number | null = null;
  let gameStatus: "new" | "in_progress" | "solved" = "new";
  let solvedSeconds: number | null = null;
  let solvedAnswer: string | null = null;

  if (user) {
    const [{ data: stats, error: statsError }, { data: progress, error: progressError }] = await Promise.all([
      userClient
        .from("stats")
        .select("current_streak, best_seconds")
        .eq("user_id", user.id)
        .eq("game", game)
        .single(),
      userClient
        .from("progress")
        .select("status, duration_seconds, assisted")
        .eq("user_id", user.id)
        .eq("puzzle_id", puzzle.id)
        .single(),
    ]);

    if (statsError && statsError.code !== "PGRST116") {
      console.error("[play/page] stats query error:", statsError);
    }
    if (progressError && progressError.code !== "PGRST116") {
      console.error("[play/page] progress query error:", progressError);
    }

    if (progress) {
      gameStatus = progress.status as "in_progress" | "solved";
      if (progress.status === "solved") {
        solvedSeconds = progress.duration_seconds ?? null;
        const sol = puzzle.solution as { answer?: string } | null;
        solvedAnswer = sol?.answer ?? null;
      }
    }

    if (stats) {
      streak = stats.current_streak ?? 0;
      bestSeconds = stats.best_seconds ?? null;
    } else if (
      gameStatus === "solved" &&
      progress?.duration_seconds != null &&
      progress.duration_seconds >= 1
    ) {
      // Stats row missing for a solved puzzle — backfill by replaying record_solve.
      // Both progress and stats use ON CONFLICT DO UPDATE so this is safe to repeat.
      const { data: repaired } = await userClient.rpc("record_solve", {
        p_puzzle_id: puzzle.id,
        p_seconds: progress.duration_seconds,
        p_assisted: progress.assisted ?? false,
      });
      const rs = Array.isArray(repaired) ? repaired[0] : repaired;
      if (rs) {
        streak = (rs as { current_streak?: number }).current_streak ?? 0;
        bestSeconds = (rs as { best_seconds?: number | null }).best_seconds ?? null;
      }
    }
  }

  const dayNum = dailyNumber(game, today);

  return (
    <GamePage
      game={game}
      gameName={gameMeta.name}
      gameJp={gameMeta.jp}
      glyph={gameMeta.glyph}
      rule={RULES[game] ?? ""}
      puzzleId={puzzle.id}
      puzzleData={puzzle.data as Record<string, unknown>}
      dailyNumber={dayNum}
      streak={streak}
      bestSeconds={bestSeconds}
      isAuthenticated={isAuthenticated}
      initialStatus={gameStatus}
      solvedSeconds={solvedSeconds}
      solvedAnswer={solvedAnswer}
    />
  );
}
