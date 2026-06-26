// Pure Nonogram logic — ported from capygames.html prototype

/** Run-length encode a line of 0/1 values */
export function clueOf(line: number[]): number[] {
  const r: number[] = [];
  let c = 0;
  for (const v of line) {
    if (v) {
      c++;
    } else if (c) {
      r.push(c);
      c = 0;
    }
  }
  if (c) r.push(c);
  return r.length ? r : [0];
}

/** True if a line (treating 1=filled, everything else=empty) matches its clue */
export function lineMatches(arr: number[], clue: number[]): boolean {
  const encoded = clueOf(arr.map((v) => (v === 1 ? 1 : 0)));
  if (encoded.length !== clue.length) return false;
  return encoded.every((n, i) => n === clue[i]);
}

/** Derive row and column clues from a flat solution string (N×N, row-major, '1'=filled) */
export function deriveClues(
  answer: string,
  N: number
): { rows: number[][]; cols: number[][] } {
  const sol = [...answer].map(Number);
  const rows: number[][] = [];
  for (let y = 0; y < N; y++) {
    rows.push(clueOf(sol.slice(y * N, (y + 1) * N)));
  }
  const cols: number[][] = [];
  for (let x = 0; x < N; x++) {
    cols.push(clueOf(Array.from({ length: N }, (_, y) => sol[y * N + x])));
  }
  return { rows, cols };
}

/** Server-side win check: compare filled cells against solution string */
export function checkWin(grid: number[], solution: string): boolean {
  for (let i = 0; i < solution.length; i++) {
    if ((grid[i] === 1) !== (solution[i] === "1")) return false;
  }
  return true;
}

/** Client-side win check: all rows and cols match their clues */
export function isComplete(
  grid: number[],
  rows: number[][],
  cols: number[][]
): boolean {
  const N = rows.length;
  for (let y = 0; y < N; y++) {
    if (!lineMatches(grid.slice(y * N, (y + 1) * N), rows[y])) return false;
  }
  for (let x = 0; x < N; x++) {
    if (!lineMatches(Array.from({ length: N }, (_, y) => grid[y * N + x]), cols[x])) return false;
  }
  return true;
}
