"use client";

import { useState, useEffect, useCallback } from "react";
import { peersOf, isBad, isComplete, parseClues } from "@/lib/games/sudoku";
import { fmt } from "@/lib/daily";
import NumberPad from "@/components/NumberPad";
import styles from "./Sudoku.module.css";

interface Props {
  puzzleId: number;
  clues: string;
  startedAt: number | null;
  glyph?: string;
  onSolve?: (seconds: number, assisted: boolean, submission: number[]) => void;
}

type HistoryEntry = { val: number[]; notes: boolean[][] };

function emptyNotes(): boolean[][] {
  return Array.from({ length: 81 }, () => Array(10).fill(false));
}

function cloneNotes(notes: boolean[][]): boolean[][] {
  return notes.map((cell) => [...cell]);
}

function loadBoard(puzzleId: number, given: number[]): { val: number[]; notes: boolean[][] } {
  try {
    const raw = localStorage.getItem(`cg_board_${puzzleId}`);
    if (raw) {
      const saved = JSON.parse(raw) as { val?: number[]; notes?: boolean[][] };
      if (Array.isArray(saved.val) && saved.val.length === 81 &&
          Array.isArray(saved.notes) && saved.notes.length === 81) {
        return { val: saved.val, notes: saved.notes };
      }
    }
  } catch {}
  return { val: [...given], notes: emptyNotes() };
}

export default function Sudoku({ puzzleId, clues, startedAt, glyph, onSolve }: Props) {
  const given = parseClues(clues);
  const [val, setVal] = useState<number[]>(() => loadBoard(puzzleId, given).val);
  const [notes, setNotes] = useState<boolean[][]>(() => loadBoard(puzzleId, given).notes);
  const [selected, setSelected] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [solvedAt, setSolvedAt] = useState<number | null>(null);
  const [assisted] = useState(false);

  const pushHist = useCallback((v: number[], n: boolean[][]) => {
    setHistory((h) => [...h.slice(-39), { val: [...v], notes: cloneNotes(n) }]);
  }, []);

  const enter = useCallback((n: number) => {
    if (selected === null || given[selected] || solvedAt) return;
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
        const cleared = cloneNotes(notes);
        peersOf(selected).forEach((p) => { cleared[p][n] = false; });
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
  }, [selected, given, solvedAt, pushHist, val, notes, notesMode, startedAt, assisted, onSolve]);

  const erase = useCallback(() => {
    if (selected === null || given[selected] || solvedAt) return;
    pushHist(val, notes);
    setVal((prev) => { const next = [...prev]; next[selected] = 0; return next; });
    setNotes((prev) => { const next = cloneNotes(prev); next[selected] = Array(10).fill(false); return next; });
  }, [selected, given, solvedAt, pushHist, val, notes]);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setVal([...prev.val]);
      setNotes(cloneNotes(prev.notes));
      return h.slice(0, -1);
    });
  }, []);

  // Persist board state so it survives navigation (restored in loadBoard on next mount)
  useEffect(() => {
    if (solvedAt) return; // don't overwrite with fully-solved board; win state not persisted
    try {
      localStorage.setItem(`cg_board_${puzzleId}`, JSON.stringify({ val, notes }));
    } catch {}
  }, [puzzleId, val, notes, solvedAt]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= "1" && e.key <= "9") enter(+e.key);
      else if (e.key === "Backspace" || e.key === "Delete") erase();
      else if (e.key.toLowerCase() === "z" && !e.shiftKey) undo();
      else if (e.key === "n") setNotesMode((m) => !m);
      else if (selected !== null) {
        const r = (selected / 9) | 0, c = selected % 9;
        if (e.key === "ArrowRight") setSelected(Math.min(80, r * 9 + c + 1));
        else if (e.key === "ArrowLeft")  setSelected(Math.max(0,  r * 9 + c - 1));
        else if (e.key === "ArrowDown")  setSelected(Math.min(80, (r + 1) * 9 + c));
        else if (e.key === "ArrowUp")    setSelected(Math.max(0,  (r - 1) * 9 + c));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enter, erase, undo, selected]);

  const counts = Array(10).fill(0);
  val.forEach((v) => v && counts[v]++);

  const peers = selected !== null ? new Set(peersOf(selected)) : new Set<number>();
  const solvedSecs = solvedAt ? Math.floor((solvedAt - (startedAt ?? solvedAt)) / 1000) : null;

  return (
    <div className={styles.wrapper}>
      {/* Board */}
      <div className={styles.board}>
        <div className={styles.grid} role="grid">
          {val.map((v, i) => {
            const isGiven = !!given[i];
            const isSel = selected === i;
            const isPeer = !isSel && peers.has(i);
            const bad = !solvedAt && isBad(val, i);
            const sameVal = !isSel && selected !== null && val[selected] !== 0 && val[selected] === v;

            return (
              <button
                key={i}
                role="gridcell"
                className={[
                  styles.cell,
                  isGiven ? styles.given : "",
                  isSel ? styles.selected : "",
                  isSel && bad ? styles.selBad : "",
                  isPeer ? styles.peer : "",
                  sameVal ? styles.sameVal : "",
                  (i % 9 === 2 || i % 9 === 5) ? styles.boxRight : "",
                  (((i / 9) | 0) === 2 || ((i / 9) | 0) === 5) ? styles.boxBottom : "",
                ].filter(Boolean).join(" ")}
                onClick={() => setSelected(i)}
                aria-label={`Row ${((i / 9) | 0) + 1} col ${(i % 9) + 1}: ${v || "empty"}`}
              >
                {v ? (
                  <span>{v}</span>
                ) : (
                  <span className={styles.noteGrid}>
                    {[1,2,3,4,5,6,7,8,9].map((n) => (
                      <small key={n}>{notes[i][n] ? n : ""}</small>
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Number pad */}
      <NumberPad onDigit={enter} disabled={!!solvedAt} counts={counts} />

      {/* Action row */}
      <div className={styles.actions}>
        <button
          className={`${styles.act} ${notesMode ? styles.actOn : ""}`}
          onClick={() => setNotesMode((m) => !m)}
          title="Toggle notes (N)"
        >
          <span className={styles.actIcon}>✏</span>
          Notes
          <span className={styles.noteState}>{notesMode ? "ON" : ""}</span>
        </button>
        <button className={styles.act} onClick={erase} title="Erase (Backspace)">
          <span className={styles.actIcon}>⌫</span>
          Erase
        </button>
        <button className={styles.act} onClick={undo} title="Undo (Z)">
          <span className={styles.actIcon}>↩</span>
          Undo
        </button>
      </div>

      {/* Win overlay */}
      {solvedAt && solvedSecs !== null && (
        <div className={styles.winOverlay}>
          <div className={styles.winCard}>
            {glyph && (
              <div
                className={styles.winGlyph}
                dangerouslySetInnerHTML={{ __html: glyph }}
              />
            )}
            <h2 className={styles.winTitle}>Solved!</h2>
            <p className={styles.winTime}>{fmt(solvedSecs)}</p>
            <p className={styles.winSub}>Sudoku · Daily</p>
          </div>
        </div>
      )}
    </div>
  );
}
