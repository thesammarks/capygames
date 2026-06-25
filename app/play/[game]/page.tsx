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

  if (user) {
    const { data: stats } = await userClient
      .from("stats")
      .select("current_streak, best_seconds")
      .eq("user_id", user.id)
      .eq("game", game)
      .single();

    if (stats) {
      streak = stats.current_streak ?? 0;
      bestSeconds = stats.best_seconds ?? null;
    }

    const { data: progress } = await userClient
      .from("progress")
      .select("status")
      .eq("user_id", user.id)
      .eq("puzzle_id", puzzle.id)
      .single();

    if (progress) {
      gameStatus = progress.status as "in_progress" | "solved";
    }
  }

  const dayNum = dailyNumber(game, today);

  return (
    <GamePage
      game={game}
      gameName={gameMeta.name}
      gameJp={gameMeta.jp}
      rule={RULES[game] ?? ""}
      puzzleId={puzzle.id}
      puzzleData={puzzle.data as Record<string, unknown>}
      dailyNumber={dayNum}
      streak={streak}
      bestSeconds={bestSeconds}
      initialStatus={gameStatus}
    />
  );
}
