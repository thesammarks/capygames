"use client";

import Link from "next/link";
import { fmt } from "@/lib/daily";
import styles from "./StartScreen.module.css";

interface Props {
  gameName: string;
  gameJp: string;
  glyph: string;
  rule: string;
  dailyNumber: number;
  streak: number;
  bestSeconds: number | null;
  status: "new" | "in_progress" | "solved";
  onPlay: () => void;
}

export default function StartScreen({
  gameName, gameJp, glyph, rule, dailyNumber, streak, bestSeconds, status, onPlay,
}: Props) {
  const actionLabel =
    status === "solved" ? "See result" :
    status === "in_progress" ? "Continue" :
    "Play";

  return (
    <div className={styles.scrim}>
      <div className={styles.card}>
        <div
          className={styles.glyph}
          dangerouslySetInnerHTML={{ __html: glyph }}
        />

        <div className={styles.acktitle}>
          {gameName}
          <span className={styles.jp}>{gameJp}</span>
        </div>

        <div className={styles.ackdate}>Daily #{dailyNumber}</div>

        <p className={styles.ackrule}>{rule}</p>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statN}>{streak > 0 ? streak : "—"}</div>
            <div className={styles.statL}>Streak</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statN}>{bestSeconds ? fmt(bestSeconds) : "—"}</div>
            <div className={styles.statL}>Best</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statN}>—</div>
            <div className={styles.statL}>vs friends</div>
          </div>
        </div>

        <button className={styles.playBtn} onClick={onPlay}>
          {actionLabel}
        </button>

        <Link href="/" className={styles.backLink}>
          Back to hub
        </Link>
      </div>
    </div>
  );
}
