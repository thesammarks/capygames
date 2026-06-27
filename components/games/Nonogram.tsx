"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { lineMatches, isComplete } from "@/lib/games/nonogram";
import { fmt } from "@/lib/daily";
import styles from "./Nonogram.module.css";

interface Props {
  puzzleId: number;
  clues: { rows: number[][]; cols: number[][] };
  startedAt: number | null;
  initialSolved?: boolean;
  glyph?: string;
  onSolve?: (seconds: number, assisted: boolean, submission: number[]) => void;
}

export default function Nonogram({ puzzleId, clues, startedAt, initialSolved = false, onSolve }: Props) {
  const N = clues.rows.length;
  const BOARD_KEY = `cg_board_${puzzleId}`;

  const [grid, setGrid] = useState<number[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(BOARD_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as number[];
          if (Array.isArray(parsed) && parsed.length === N * N) return parsed;
        }
      } catch {}
    }
    return Array(N * N).fill(0);
  });

  const [tool, setTool] = useState<1 | 2>(1);
  const [history, setHistory] = useState<number[][]>([]);
  const [solved, setSolved] = useState(initialSolved);
  const [cellSize, setCellSize] = useState(N <= 6 ? 54 : 38);

  // Refs for drag state — avoids stale closure issues in event handlers
  const drawingRef = useRef(false);
  const drawValRef = useRef(0);
  const axisRef = useRef<"row" | "col" | null>(null);
  const oxRef = useRef(0);
  const oyRef = useRef(0);
  const liveGridRef = useRef([...grid]); // definitive grid during drag
  const solvedRef = useRef(initialSolved);

  // Keep liveGridRef in sync when grid changes outside a drag
  useEffect(() => {
    if (!drawingRef.current) liveGridRef.current = [...grid];
  }, [grid]);

  // Responsive cell sizing
  useEffect(() => {
    function resize() {
      const cap = N <= 6 ? 54 : 38;
      const gm = N <= 6 ? 2.6 : 3.4;
      const avail = Math.min(window.innerWidth - 32, 560);
      setCellSize(Math.max(22, Math.min(cap, Math.floor(avail / (N + gm)))));
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [N]);

  // Save board to localStorage whenever grid changes
  useEffect(() => {
    if (!solvedRef.current) {
      try {
        localStorage.setItem(BOARD_KEY, JSON.stringify(grid));
      } catch {}
    }
  }, [grid, BOARD_KEY]);

  // Derived: which rows/cols are satisfied (for clue highlighting)
  const satisfiedRows = clues.rows.map((clue, y) =>
    lineMatches(grid.slice(y * N, (y + 1) * N), clue)
  );
  const satisfiedCols = clues.cols.map((clue, x) =>
    lineMatches(
      Array.from({ length: N }, (_, y) => grid[y * N + x]),
      clue
    )
  );

  // Gutter width (row-clue area)
  const gutterW = Math.round(cellSize * (N <= 6 ? 2.6 : 3.4));

  function cellAt(cx: number, cy: number): [number, number] | null {
    const el = document.elementFromPoint(cx, cy);
    const d = (el?.closest("[data-xy]") ?? null) as HTMLElement | null;
    if (!d?.dataset.xy) return null;
    const [x, y] = d.dataset.xy.split(",").map(Number);
    return [x, y];
  }

  function applyToLive(x: number, y: number): boolean {
    if (axisRef.current === "row" && y !== oyRef.current) return false;
    if (axisRef.current === "col" && x !== oxRef.current) return false;
    const idx = y * N + x;
    if (liveGridRef.current[idx] === drawValRef.current) return false;
    liveGridRef.current[idx] = drawValRef.current;
    return true;
  }

  function autoMark(g: number[]): number[] {
    let changed = false;
    const next = [...g];
    for (let y = 0; y < N; y++) {
      if (lineMatches(next.slice(y * N, (y + 1) * N), clues.rows[y])) {
        for (let x = 0; x < N; x++) {
          if (next[y * N + x] === 0) { next[y * N + x] = 2; changed = true; }
        }
      }
    }
    for (let x = 0; x < N; x++) {
      const col = Array.from({ length: N }, (_, y) => next[y * N + x]);
      if (lineMatches(col, clues.cols[x])) {
        for (let y = 0; y < N; y++) {
          if (next[y * N + x] === 0) { next[y * N + x] = 2; changed = true; }
        }
      }
    }
    return changed ? next : g;
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (solvedRef.current) return;
    const pos = cellAt(e.clientX, e.clientY);
    if (!pos) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = pos;
    const t = e.button === 2 ? 2 : tool;
    drawValRef.current = liveGridRef.current[y * N + x] === t ? 0 : t;
    axisRef.current = null;
    oxRef.current = x;
    oyRef.current = y;
    drawingRef.current = true;
    setHistory((h) => [...h.slice(-39), [...liveGridRef.current]]);
    applyToLive(x, y);
    setGrid([...liveGridRef.current]);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drawingRef.current) return;
    const pos = cellAt(e.clientX, e.clientY);
    if (!pos) return;
    const [x, y] = pos;
    if (!axisRef.current && (x !== oxRef.current || y !== oyRef.current)) {
      axisRef.current = x !== oxRef.current ? "row" : "col";
    }
    if (applyToLive(x, y)) setGrid([...liveGridRef.current]);
  }

  const endStroke = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    axisRef.current = null;
    // Auto-mark satisfied rows/cols
    const marked = autoMark(liveGridRef.current);
    if (marked !== liveGridRef.current) {
      liveGridRef.current = marked;
      setGrid([...marked]);
    }
    // Check win
    if (!solvedRef.current && isComplete(liveGridRef.current, clues.rows, clues.cols)) {
      solvedRef.current = true;
      setSolved(true);
      const elapsed = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
      onSolve?.(elapsed, false, [...liveGridRef.current]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clues.rows, clues.cols, startedAt, onSolve]);

  useEffect(() => {
    window.addEventListener("pointerup", endStroke);
    window.addEventListener("pointercancel", endStroke);
    return () => {
      window.removeEventListener("pointerup", endStroke);
      window.removeEventListener("pointercancel", endStroke);
    };
  }, [endStroke]);

  function undo() {
    if (!history.length || solvedRef.current) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    liveGridRef.current = [...prev];
    setGrid([...prev]);
  }

  function reset() {
    if (solvedRef.current) return;
    setHistory((h) => [...h, [...liveGridRef.current]]);
    const empty = Array(N * N).fill(0);
    liveGridRef.current = empty;
    setGrid([...empty]);
  }

  const elapsed = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;

  return (
    <div className={styles.wrap}>
      <div className={styles.board} style={{ paddingRight: gutterW }}>
        {/* Col clues row */}
        <div className={styles.colsRow}>
          <div className={styles.corner} style={{ width: gutterW }} />
          <div className={styles.colClues}>
            {clues.cols.map((clue, x) => (
              <div
                key={x}
                className={`${styles.colClue}${satisfiedCols[x] ? " " + styles.done : ""}`}
                style={{ width: cellSize }}
              >
                {clue.map((n, i) => <span key={i}>{n}</span>)}
              </div>
            ))}
          </div>
        </div>

        {/* Main area: row clues + grid */}
        <div className={styles.mainRow}>
          <div className={styles.rowClues} style={{ width: gutterW }}>
            {clues.rows.map((clue, y) => (
              <div
                key={y}
                className={`${styles.rowClue}${satisfiedRows[y] ? " " + styles.done : ""}`}
                style={{ height: cellSize }}
              >
                {clue.map((n, i) => <span key={i}>{n}</span>)}
              </div>
            ))}
          </div>

          <div
            className={`${styles.grid}${solved ? " " + styles.solved : ""}`}
            style={{ gridTemplateColumns: `repeat(${N}, ${cellSize}px)` }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onContextMenu={(e) => e.preventDefault()}
          >
            {Array.from({ length: N * N }, (_, i) => {
              const x = i % N, y = (i / N) | 0;
              const v = grid[i];
              return (
                <div
                  key={i}
                  data-xy={`${x},${y}`}
                  className={[
                    styles.cell,
                    v === 1 ? styles.fill : "",
                    v === 2 ? styles.mark : "",
                    N > 5 && (x + 1) % 5 === 0 ? styles.bx : "",
                    N > 5 && (y + 1) % 5 === 0 ? styles.by : "",
                  ].filter(Boolean).join(" ")}
                  style={{ width: cellSize, height: cellSize }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <button
          className={`${styles.toolBtn}${tool === 1 ? " " + styles.active : ""}`}
          onClick={() => setTool(1)}
          aria-pressed={tool === 1}
        >
          Fill
        </button>
        <button
          className={`${styles.toolBtn}${tool === 2 ? " " + styles.active : ""}`}
          onClick={() => setTool(2)}
          aria-pressed={tool === 2}
        >
          ✕ Mark
        </button>
        <button
          className={styles.toolBtn}
          onClick={undo}
          disabled={!history.length || solved}
        >
          Undo
        </button>
        <button
          className={styles.toolBtn}
          onClick={reset}
          disabled={solved}
        >
          Reset
        </button>
      </div>

      {solved && (
        <div className={styles.winBanner}>
          <strong>Puzzle solved!</strong>
          {fmt(elapsed)}
        </div>
      )}
    </div>
  );
}
