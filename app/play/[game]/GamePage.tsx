"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import StartScreen from "@/components/StartScreen";
import GameClock from "@/components/GameClock";
import Sudoku from "@/components/games/Sudoku";
import styles from "./GamePage.module.css";

interface Props {
  game: string;
  gameName: string;
  gameJp: string;
  glyph: string;
  rule: string;
  puzzleId: number;
  puzzleData: Record<string, unknown>;
  dailyNumber: number;
  streak: number;
  bestSeconds: number | null;
  initialStatus: "new" | "in_progress" | "solved";
}

export default function GamePage({
  game, gameName, gameJp, glyph, rule,
  puzzleId, puzzleData, dailyNumber, streak, bestSeconds, initialStatus,
}: Props) {
  const storageKey = `sg_start_${puzzleId}`;

  // For new games, don't render the game until the user clicks Play (keeps puzzle hidden)
  const [gameReady, setGameReady] = useState(initialStatus !== "new");
  const [showStart, setShowStart] = useState(true);
  const [status, setStatus] = useState(initialStatus);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(storageKey);
    if (stored) setStartedAt(Number(stored));
  }, [storageKey]);

  function handlePlay() {
    if (!gameReady) setGameReady(true);
    setShowStart(false);
    if (!startedAt) {
      const t = Date.now();
      setStartedAt(t);
      sessionStorage.setItem(storageKey, String(t));
    }
  }

  async function handleSolve(seconds: number, assisted: boolean, submission: unknown) {
    setStatus("solved");
    try {
      await fetch("/api/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game, clientSeconds: seconds, submission, assisted }),
      });
    } catch {
      // Non-critical: result already shown in UI
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.svg" alt="" className={styles.logo} />
          <span className={styles.wordmark}>
            Capy<span>games</span>
          </span>
        </Link>
        <div className={styles.headerRight}>
          <span className={styles.meta}>
            {gameName} · Daily #{dailyNumber}
          </span>
          <GameClock startedAt={showStart ? null : startedAt} />
        </div>
      </header>

      {showStart && (
        <StartScreen
          gameName={gameName}
          gameJp={gameJp}
          glyph={glyph}
          rule={rule}
          dailyNumber={dailyNumber}
          streak={streak}
          bestSeconds={bestSeconds}
          status={status}
          onPlay={handlePlay}
        />
      )}

      {gameReady && game === "sudoku" && (
        <Sudoku
          puzzleId={puzzleId}
          clues={(puzzleData as { clues: string }).clues}
          startedAt={startedAt}
          glyph={glyph}
          onSolve={handleSolve}
        />
      )}

      {gameReady && game !== "sudoku" && (
        <div style={{ padding: "2rem", textAlign: "center", fontFamily: "var(--kaku)", color: "var(--ink-soft)" }}>
          {gameName} coming soon.
        </div>
      )}
    </main>
  );
}
