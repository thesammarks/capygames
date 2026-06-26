"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type GameMeta } from "@/lib/rules";
import { getGuestProgress, type GuestGameProgress } from "@/lib/guestProgress";
import { fmt } from "@/lib/daily";
import styles from "./HubTiles.module.css";

interface GameStatus {
  status: "in_progress" | "solved";
  duration_seconds: number | null;
}

interface Props {
  games: GameMeta[];
  serverProgress: Record<string, GameStatus>;
  isAuthenticated: boolean;
  today: string;
}

export default function HubTiles({ games, serverProgress, isAuthenticated, today }: Props) {
  const [progress, setProgress] = useState<Record<string, GameStatus>>(serverProgress);

  useEffect(() => {
    if (isAuthenticated) return;
    const local = getGuestProgress(today) as Record<string, GuestGameProgress>;
    if (Object.keys(local).length > 0) setProgress(local);
  }, [isAuthenticated, today]);

  return (
    <section className={styles.grid}>
      {games.map((g) => {
        const ps = progress[g.id];
        const isDone = ps?.status === "solved";
        const isProg = ps?.status === "in_progress";

        return (
          <Link key={g.id} href={`/play/${g.id}`} className={styles.tile}>
            <div className={styles.tileTop}>
              <div className={styles.glyph} dangerouslySetInnerHTML={{ __html: g.glyph }} />
            </div>
            <div className={styles.tileName}>
              {g.name}
              <span className={styles.tileJp}>{g.jp}</span>
            </div>
            <p className={styles.tileDesc}>{g.desc}</p>
            <div className={`${styles.tileStatus}${isDone ? ` ${styles.tileStatusDone}` : ""}`}>
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
              {!isDone && <span className={styles.play}>Play →</span>}
            </div>
          </Link>
        );
      })}
    </section>
  );
}
