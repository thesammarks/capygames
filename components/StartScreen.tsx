"use client";

import { fmt } from "@/lib/daily";
import Seal from "./Seal";
import styles from "./StartScreen.module.css";

interface Props {
  gameName: string;
  gameJp: string;
  rule: string;
  dailyNumber: number;
  streak: number;
  bestSeconds: number | null;
  status: "new" | "in_progress" | "solved";
  onPlay: () => void;
}

export default function StartScreen({
  gameName,
  gameJp,
  rule,
  dailyNumber,
  streak,
  bestSeconds,
  status,
  onPlay,
}: Props) {
  const actionLabel =
    status === "solved"
      ? "See result"
      : status === "in_progress"
        ? "Continue"
        : "Play";

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.seal}>
          <Seal size={72} />
        </div>

        <div className={styles.header}>
          <h1 className={styles.title}>{gameName}</h1>
          <span className={styles.jp}>{gameJp}</span>
        </div>

        <p className={styles.label}>Daily #{dailyNumber}</p>

        <p className={styles.rule}>{rule}</p>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Streak</span>
            <span className={styles.statValue}>
              {streak > 0 ? `🔥 ${streak}` : "—"}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Best</span>
            <span className={styles.statValue}>
              {bestSeconds ? fmt(bestSeconds) : "—"}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Rank</span>
            <span className={styles.statValue}>—</span>
          </div>
        </div>

        <button className={styles.playBtn} onClick={onPlay}>
          {actionLabel} →
        </button>
      </div>
    </div>
  );
}
