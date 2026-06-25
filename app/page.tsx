import Link from "next/link";
import { GAMES } from "@/lib/rules";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { todayUTC, fmt } from "@/lib/daily";
import styles from "./page.module.css";

interface GameStatus {
  status: "in_progress" | "solved";
  duration_seconds: number | null;
}

export default async function Home() {
  // Fetch user's progress for today's puzzles
  const progressMap: Record<string, GameStatus> = {};

  try {
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();

    if (user) {
      const today = todayUTC();
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
    // Not signed in or DB error — show all tiles as "New"
  }

  const doneCount = Object.values(progressMap).filter((p) => p.status === "solved").length;

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/favicon.svg" alt="" className={styles.logo} />
        <h1 className={styles.title}>
          Capy<span>games</span>
        </h1>
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

      <section className={styles.grid}>
        {GAMES.map((g) => {
          const ps = progressMap[g.id];
          const isDone = ps?.status === "solved";
          const isProg = ps?.status === "in_progress";

          return (
            <Link key={g.id} href={`/play/${g.id}`} className={styles.tile}>
              <div className={styles.tileTop}>
                <div
                  className={styles.glyph}
                  dangerouslySetInnerHTML={{ __html: g.glyph }}
                />
              </div>
              <div className={styles.tileName}>
                {g.name}
                <span className={styles.tileJp}>{g.jp}</span>
              </div>
              <p className={styles.tileDesc}>{g.desc}</p>
              <div
                className={`${styles.tileStatus}${isDone ? ` ${styles.tileStatusDone}` : ""}`}
              >
                <span
                  className={`${styles.dotmark}${isDone ? ` ${styles.dotmarkDone}` : isProg ? ` ${styles.dotmarkProg}` : ""}`}
                />
                <span>
                  {isDone
                    ? `Solved · ${fmt(ps.duration_seconds ?? 0)}`
                    : isProg
                      ? "In progress"
                      : "New"}
                </span>
                {!isDone && (
                  <span className={styles.play}>Play →</span>
                )}
              </div>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
