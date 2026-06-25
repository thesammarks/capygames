// Pure Sudoku logic — ported verbatim from capygames.html prototype

export interface SudokuPuzzle {
  clues: string; // 81-char string, 0 = empty
  solution: string; // 81-char string
  difficulty?: string;
}

/** All cell indices in the same row, column, or 3×3 box as i (excluding i) */
export function peersOf(i: number): number[] {
  const r = (i / 9) | 0,
    c = i % 9,
    br = 3 * ((r / 3) | 0),
    bc = 3 * ((c / 3) | 0),
    set = new Set<number>();
  for (let k = 0; k < 9; k++) {
    set.add(r * 9 + k);
    set.add(k * 9 + c);
  }
  for (let a = 0; a < 3; a++)
    for (let b = 0; b < 3; b++) set.add((br + a) * 9 + bc + b);
  set.delete(i);
  return [...set];
}

/** True if cell i has a duplicate value among its peers */
export function isBad(val: number[], i: number): boolean {
  const v = val[i];
  if (!v) return false;
  return peersOf(i).some((p) => val[p] === v);
}

/** True if every cell matches the solution string (server-side use) */
export function checkWin(val: number[], solution: string): boolean {
  for (let i = 0; i < 81; i++) if (val[i] !== +solution[i]) return false;
  return true;
}

/** Client-safe win check: all 81 cells filled with no conflicts */
export function isComplete(val: number[]): boolean {
  if (val.some((v) => !v)) return false;
  return val.every((_, i) => !isBad(val, i));
}

/** Build the initial val array from a clues string (81 chars, 0 = empty) */
export function parseClues(clues: string): number[] {
  return clues.split("").map(Number);
}
