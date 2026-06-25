"use client";

import { useState } from "react";
import StartScreen from "@/components/StartScreen";
import Sudoku from "@/components/games/Sudoku";

interface Props {
  game: string;
  gameName: string;
  gameJp: string;
  rule: string;
  puzzleId: number;
  puzzleData: Record<string, unknown>;
  dailyNumber: number;
  streak: number;
  bestSeconds: number | null;
  initialStatus: "new" | "in_progress" | "solved";
}

export default function GamePage({
  game,
  gameName,
  gameJp,
  rule,
  puzzleId,
  puzzleData,
  dailyNumber,
  streak,
  bestSeconds,
  initialStatus,
}: Props) {
  const [showStart, setShowStart] = useState(initialStatus !== "in_progress");
  const [status, setStatus] = useState(initialStatus);

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
    <>
      {showStart && (
        <StartScreen
          gameName={gameName}
          gameJp={gameJp}
          rule={rule}
          dailyNumber={dailyNumber}
          streak={streak}
          bestSeconds={bestSeconds}
          status={status}
          onPlay={() => setShowStart(false)}
        />
      )}

      <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
        <header
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontFamily: "var(--maru)",
          }}
        >
          <a href="/" style={{ color: "var(--yuzu)", fontWeight: 700 }}>
            Capygames
          </a>
          <span style={{ color: "var(--ink-soft)", fontSize: "0.85rem" }}>
            {gameName} · Daily #{dailyNumber}
          </span>
        </header>

        {game === "sudoku" && (
          <Sudoku
            puzzleId={puzzleId}
            clues={(puzzleData as { clues: string }).clues}
            onSolve={(secs, ast, sub) => handleSolve(secs, ast, sub)}
          />
        )}

        {game !== "sudoku" && (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              fontFamily: "var(--kaku)",
              color: "var(--ink-soft)",
            }}
          >
            {gameName} coming soon — Sudoku is the first vertical slice.
          </div>
        )}
      </main>
    </>
  );
}
