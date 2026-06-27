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

  // Fetch puzzle WITHOUT solution (strips it below)
  const { data: puzzle } = await service
    .from("puzzles")
    .select("id, data, play_date")
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

  let streak = 0;
  let bestSeconds: number | null = null;
  let gameStatus: "new" | "in_progress" | "solved" = "new";
  let solvedSeconds: number | null = null;

  if (user) {
    const { data: stats, error: statsError } = await userClient
      .from("stats")
      .select("current_streak, best_seconds")
      .eq("user_id", user.id)
      .eq("game", game)
      .single();

    if (statsError && statsError.code !== "PGRST116") {
      console.error("[play/page] stats query error:", statsError);
    }
    if (stats) {
      streak = stats.current_streak ?? 0;
      bestSeconds = stats.best_seconds ?? null;
    }

    const { data: progress, error: progressError } = await userClient
      .from("progress")
      .select("status, duration_seconds")
      .eq("user_id", user.id)
      .eq("puzzle_id", puzzle.id)
      .single();

    if (progressError && progressError.code !== "PGRST116") {
      console.error("[play/page] progress query error:", progressError);
    }
    if (progress) {
      gameStatus = progress.status as "in_progress" | "solved";
      if (progress.status === "solved") solvedSeconds = progress.duration_seconds ?? null;
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
      initialStatus={gameStatus}
      solvedSeconds={solvedSeconds}
    />
  );
}
