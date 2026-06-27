"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import StartScreen from "@/components/StartScreen";
import GameClock from "@/components/GameClock";
import ThemeToggle from "@/components/ThemeToggle";
import Sudoku from "@/components/games/Sudoku";
import Nonogram from "@/components/games/Nonogram";
import { getGuestProgress, setGuestProgress } from "@/lib/guestProgress";
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
  isAuthenticated: boolean;
  initialStatus: "new" | "in_progress" | "solved";
  solvedSeconds?: number | null;
  solvedAnswer?: string | null;
}

export default function GamePage({
  game, gameName, gameJp, glyph, rule,
  puzzleId, puzzleData, dailyNumber, streak, bestSeconds,
  isAuthenticated, initialStatus, solvedSeconds, solvedAnswer,
}: Props) {
  const storageKey = `sg_start_${puzzleId}`;

  // Never pre-render the game — keeps the puzzle hidden behind the start screen
  const [gameReady, setGameReady] = useState(false);
  const [showStart, setShowStart] = useState(true);
  const [status, setStatus] = useState(initialStatus);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  // Stateful so handleSolve can update them from the API response
  const [currentStreak, setCurrentStreak] = useState(streak);
  const [currentBest, setCurrentBest] = useState(bestSeconds);

  // Restore startedAt: sessionStorage first (fast path), then localStorage (survives tab close)
  useEffect(() => {
    const stored = sessionStorage.getItem(storageKey);
    if (stored) {
      setStartedAt(Number(stored));
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const prog = getGuestProgress(today)[game];
    if (prog?.startedAt) {
      setStartedAt(prog.startedAt);
      sessionStorage.setItem(storageKey, String(prog.startedAt));
    }
  }, [storageKey, game]);

  // For guests only: sync status from localStorage (server can't see guest progress).
  // Authenticated users trust the DB — localStorage may be stale after PostLoginMigrate clears it.
  useEffect(() => {
    if (isAuthenticated) return;
    const today = new Date().toISOString().slice(0, 10);
    const prog = getGuestProgress(today)[game];
    if (!prog) return;
    setStatus(prog.status);
  }, [game, isAuthenticated]);

  function handlePlay() {
    setGameReady(true);
    setShowStart(false);
    // Don't touch progress for already-completed games
    if (status === "solved") return;
    const today = new Date().toISOString().slice(0, 10);
    if (!startedAt) {
      const t = Date.now();
      setStartedAt(t);
      sessionStorage.setItem(storageKey, String(t));
      setGuestProgress(today, game, "in_progress", null, t);
    } else {
      setGuestProgress(today, game, "in_progress", null);
    }
  }

  async function handleSolve(seconds: number, assisted: boolean, submission: unknown) {
    const today = new Date().toISOString().slice(0, 10);
    // Hold win state visible for at least 1.5s before showing the result screen
    const delay = new Promise<void>((r) => setTimeout(r, 1500));
    let confirmed = false;
    try {
      const res = await fetch("/api/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game, clientSeconds: seconds, submission, assisted }),
      });
      if (res.ok) {
        const data = await res.json() as { streak?: number; best?: number | null };
        if (data.streak != null) setCurrentStreak(data.streak);
        if (data.best != null) setCurrentBest(data.best);
        // Only confirm solve locally once the server has recorded it
        setStatus("solved");
        setGuestProgress(today, game, "solved", seconds);
        confirmed = true;
      }
    } catch {
      // Network error: win banner stays, start screen not shown — user can retry on revisit
    }
    await delay;
    if (confirmed) setShowStart(true);
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
          {startedAt && <GameClock startedAt={startedAt} paused={showStart || status === "solved"} />}
          <ThemeToggle />
        </div>
      </header>

      {showStart && (
        <StartScreen
          gameName={gameName}
          gameJp={gameJp}
          glyph={glyph}
          rule={rule}
          dailyNumber={dailyNumber}
          streak={currentStreak}
          bestSeconds={currentBest}
          status={status}
          startedAt={startedAt}
          onPlay={handlePlay}
        />
      )}

      {gameReady && game === "sudoku" && (
        <Sudoku
          puzzleId={puzzleId}
          clues={(puzzleData as { clues: string }).clues}
          startedAt={startedAt}
          initialSolved={status === "solved"}
          glyph={glyph}
          onSolve={handleSolve}
        />
      )}

      {gameReady && (game === "nonogram" || game === "nonomini") && (
        <Nonogram
          puzzleId={puzzleId}
          clues={(puzzleData as { clues: { rows: number[][]; cols: number[][] } }).clues}
          startedAt={startedAt}
          initialSolved={status === "solved"}
          solvedSeconds={solvedSeconds}
          solvedAnswer={solvedAnswer}
          onSolve={handleSolve}
        />
      )}

      {gameReady && game !== "sudoku" && game !== "nonogram" && game !== "nonomini" && (
        <div style={{ padding: "2rem", textAlign: "center", fontFamily: "var(--kaku)", color: "var(--ink-soft)" }}>
          {gameName} coming soon.
        </div>
      )}
    </main>
  );
}
