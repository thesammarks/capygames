"use client";

import { useState, useEffect, useCallback } from "react";
import { peersOf, isBad, isComplete, parseClues } from "@/lib/games/sudoku";
import { fmt } from "@/lib/daily";
import NumberPad from "@/components/NumberPad";
import GameClock from "@/components/GameClock";
import Seal from "@/components/Seal";
import styles from "./Sudoku.module.css";

interface Props {
  puzzleId: number;
  clues: string;
  onSolve?: (seconds: number, assisted: boolean, submission: number[]) => void;
}

type HistoryEntry = { val: number[]; notes: boolean[][] };

function emptyNotes(): boolean[][] {
  return Array.from({ length: 81 }, () => Array(10).fill(false));
}

function cloneNotes(notes: boolean[][]): boolean[][] {
  return notes.map((cell) => [...cell]);
}

export default function Sudoku({ puzzleId, clues, onSolve }: Props) {
  const given = parseClues(clues);
  const [val, setVal] = useState<number[]>([...given]);
  const [notes, setNotes] = useState<boolean[][]>(emptyNotes);
  const [selected, setSelected] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [solvedAt, setSolvedAt] = useState<number | null>(null);
  const [assisted] = useState(false); // will expand in Phase 7

  const startClock = useCallback(() => {
    if (!startedAt) setStartedAt(Date.now());
  }, [startedAt]);

  const pushHist = useCallback(
    (v: number[], n: boolean[][]) => {
      setHistory((h) => [...h.slice(-39), { val: [...v], notes: cloneNotes(n) }]);
    },
    []
  );

  const enter = useCallback(
    (n: number) => {
      if (selected === null || given[selected] || solvedAt) return;
      startClock();
      pushHist(val, notes);

      if (notesMode) {
        setNotes((prev) => {
          const next = cloneNotes(prev);
          next[selected][n] = !next[selected][n];
          return next;
        });
      } else {
        setVal((prev) => {
          const next = [...prev];
          next[selected] = prev[selected] === n ? 0 : n;

          // Clear this digit from peers' notes
          const cleared = cloneNotes(notes);
          peersOf(selected).forEach((p) => {
            cleared[p][n] = false;
          });
          setNotes(cleared);

          if (isComplete(next)) {
            const now = Date.now();
            const secs = Math.floor((now - (startedAt ?? now)) / 1000);
            setSolvedAt(now);
            onSolve?.(secs, assisted, next);
          }

          return next;
        });
      }
    },
    [selected, given, solvedAt, startClock, pushHist, val, notes, notesMode, clues, startedAt, assisted, onSolve]
  );

  const erase = useCallback(() => {
    if (selected === null || given[selected] || solvedAt) return;
    startClock();
    pushHist(val, notes);
    setVal((prev) => {
      const next = [...prev];
      next[selected] = 0;
      return next;
    });
    setNotes((prev) => {
      const next = cloneNotes(prev);
      next[selected] = Array(10).fill(false);
      return next;
    });
  }, [selected, given, solvedAt, startClock, pushHist, val, notes]);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setVal([...prev.val]);
      setNotes(cloneNotes(prev.notes));
      return h.slice(0, -1);
    });
  }, []);

  // Keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= "1" && e.key <= "9") enter(+e.key);
      else if (e.key === "Backspace" || e.key === "Delete") erase();
      else if (e.key.toLowerCase() === "z" && !e.shiftKey) undo();
      else if (e.key === "n") setNotesMode((m) => !m);
      else if (selected !== null) {
        const r = (selected / 9) | 0,
          c = selected % 9;
        if (e.key === "ArrowRight") setSelected(Math.min(80, r * 9 + c + 1));
        else if (e.key === "ArrowLeft") setSelected(Math.max(0, r * 9 + c - 1));
        else if (e.key === "ArrowDown") setSelected(Math.min(80, (r + 1) * 9 + c));
        else if (e.key === "ArrowUp") setSelected(Math.max(0, (r - 1) * 9 + c));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enter, erase, undo, selected]);

  // Counts per digit (1–9)
  const counts = Array(10).fill(0);
  val.forEach((v) => v && counts[v]++);

  const peers = selected !== null ? new Set(peersOf(selected)) : new Set<number>();

  const solvedSecs = solvedAt
    ? Math.floor((solvedAt - (startedAt ?? solvedAt)) / 1000)
    : null;

  return (
    <div className={styles.wrapper}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <GameClock startedAt={startedAt} />
        <button
          className={`${styles.toolBtn} ${notesMode ? styles.active : ""}`}
          onClick={() => setNotesMode((m) => !m)}
          title="Toggle notes (N)"
        >
          ✏️ Notes
        </button>
        <button className={styles.toolBtn} onClick={undo} title="Undo (Z)">
          ↩ Undo
        </button>
      </div>

      {/* Grid */}
      <div className={styles.grid} role="grid">
        {val.map((v, i) => {
          const isGiven = !!given[i];
          const isSel = selected === i;
          const isPeer = peers.has(i);
          const bad = !solvedAt && isBad(val, i);
          const sameVal = selected !== null && val[selected] && val[selected] === v && !isSel;

          return (
            <button
              key={i}
              role="gridcell"
              className={[
                styles.cell,
                isGiven ? styles.given : "",
                isSel ? styles.selected : "",
                isPeer && !isSel ? styles.peer : "",
                bad ? styles.bad : "",
                sameVal ? styles.sameVal : "",
                (i % 9 === 2 || i % 9 === 5) ? styles.boxRight : "",
                (((i / 9) | 0) === 2 || ((i / 9) | 0) === 5) ? styles.boxBottom : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                setSelected(i);
                startClock();
              }}
              aria-label={`Row ${((i / 9) | 0) + 1} column ${(i % 9) + 1}: ${v || "empty"}`}
            >
              {v ? (
                <span>{v}</span>
              ) : (
                <span className={styles.noteGrid}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) =>
                    notes[i][n] ? (
                      <small key={n}>{n}</small>
                    ) : (
                      <small key={n} />
                    )
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Number pad */}
      <NumberPad
        onDigit={enter}
        onErase={erase}
        disabled={!!solvedAt}
        counts={counts}
      />

      {/* Win overlay */}
      {solvedAt && solvedSecs !== null && (
        <div className={styles.winOverlay}>
          <div className={styles.winCard}>
            <Seal size={64} />
            <h2 className={styles.winTitle}>Solved! 🎉</h2>
            <p className={styles.winTime}>{fmt(solvedSecs)}</p>
            <p className={styles.winSub}>Sudoku complete</p>
          </div>
        </div>
      )}
    </div>
  );
}
