import { GAMES } from "@/lib/rules";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { todayUTC } from "@/lib/daily";
import ThemeToggle from "@/components/ThemeToggle";
import HubTiles from "@/components/HubTiles";
import styles from "./page.module.css";

interface GameStatus {
  status: "in_progress" | "solved";
  duration_seconds: number | null;
}

export default async function Home() {
  const today = todayUTC();
  const progressMap: Record<string, GameStatus> = {};
  let isAuthenticated = false;

  try {
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();

    if (user) {
      isAuthenticated = true;
      const service = createServiceClient();
      const { data: puzzles } = await service
        .from("puzzles")
        .select("id, game")
        .eq("play_date", today);

      if (puzzles?.length) {
        const { data: progress } = await userClient
          .from("progress")
          .select("puzzle_id, status, duration_seconds")
          .in("puzzle_id", puzzles.map((p) => p.id));

        if (progress) {
          puzzles.forEach((p) => {
            const pr = progress.find((r) => r.puzzle_id === p.id);
            if (pr) progressMap[p.game] = { status: pr.status as GameStatus["status"], duration_seconds: pr.duration_seconds };
          });
        }
      }
    }
  } catch {
    // Not signed in or DB error — tiles handled client-side via localStorage
  }

  const doneCount = Object.values(progressMap).filter((p) => p.status === "solved").length;

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.svg" alt="" className={styles.logo} />
          <h1 className={styles.title}>
            Capy<span>games</span>
          </h1>
        </div>
        <ThemeToggle />
      </header>

      <div className={styles.hero}>
        <p className={styles.eyebrow}>Daily · Puzzle</p>
        <p className={styles.heroHead}>Five puzzles, every day.</p>
        <p className={styles.heroSub}>
          {doneCount > 0
            ? `${doneCount} of ${GAMES.length} done today.`
            : "Free, ad-free, one puzzle per game per day."}
        </p>
      </div>

      <HubTiles
        games={GAMES}
        serverProgress={progressMap}
        isAuthenticated={isAuthenticated}
        today={today}
      />
    </main>
  );
}
