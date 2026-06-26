/**
 * Seed script — run with: npx tsx scripts/seed.ts
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---- Nonogram helpers ----

function clueOf(line: number[]): number[] {
  const r: number[] = [];
  let c = 0;
  for (const v of line) {
    if (v) { c++; } else if (c) { r.push(c); c = 0; }
  }
  if (c) r.push(c);
  return r.length ? r : [0];
}

function processNono(g: string[]) {
  const N = g.length;
  const sol2d = g.map((row) => [...row].map((ch) => (ch === "#" ? 1 : 0)));
  const rows = sol2d.map((row) => clueOf(row));
  const cols = Array.from({ length: N }, (_, x) => clueOf(sol2d.map((r) => r[x])));
  const answer = sol2d.flat().join("");
  return { data: { clues: { rows, cols } }, solution: { answer } };
}

// ---- Puzzle definitions ----

const NONO_FULL = [
  { name: "a heart",         g: [".##....##.","####..####","##########","##########","##########",".########.","..######..","...####...","....##....",".........."] },
  { name: "a space invader", g: ["..........","..#....#..","...#..#...","..######..",".##.##.##.","##########","#.######.#","#.#....#.#","..#.##.#..",".........."] },
  { name: "a mushroom",      g: ["...####...",".########.","##########","##.####.##","##########",".########.","...####...","...####...","..######..",".........."] },
  { name: "a sailboat",      g: ["....#.....","....##....","....#.#...","....#..#..","....#...#.","..........",".########.","..######..","..........",".........."] },
];

const NONO_MINI = [
  { name: "a heart",      g: [".#.#.","#####","#####",".###.","..#.."] },
  { name: "a diamond",    g: ["..#..",".###.","#####",".###.","..#.."] },
  { name: "a cross",      g: ["..#..","..#..","#####","..#..","..#.."] },
  { name: "an arrow",     g: ["..#..",".###.","#.#.#","..#..","..#.."] },
  { name: "a checkmark",  g: ["....#","...#.","#.#..","##...",".#..."] },
];

// ---- Puzzles to seed ----

const today = todayUTC();

// Pick today's nonogram using a simple deterministic index based on the date
const dayIndex = Math.floor(Date.now() / 86400000); // days since epoch
const fullPuzzle = NONO_FULL[dayIndex % NONO_FULL.length];
const miniPuzzle = NONO_MINI[dayIndex % NONO_MINI.length];
const { data: fullData, solution: fullSolution } = processNono(fullPuzzle.g);
const { data: miniData, solution: miniSolution } = processNono(miniPuzzle.g);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const puzzles: Array<Record<string, any>> = [
  {
    game: "sudoku",
    play_date: today,
    difficulty: "medium",
    data: {
      clues: "530070000600195000098000060800060003400803001700020006060000280000419005000080079",
    },
    solution: {
      answer: "534678912672195348198342567859761423426853791713924856961537284287419635345286179",
    },
  },
  {
    game: "nonogram",
    play_date: today,
    difficulty: "medium",
    data: fullData,
    solution: fullSolution,
  },
  {
    game: "nonomini",
    play_date: today,
    difficulty: "easy",
    data: miniData,
    solution: miniSolution,
  },
];

async function seed() {
  for (const p of puzzles) {
    const { error } = await supabase
      .from("puzzles")
      .upsert(p, { onConflict: "game,play_date" });

    if (error) {
      console.error(`Failed to seed ${p.game} ${p.play_date}:`, error.message);
    } else {
      console.log(`✓ Seeded ${p.game} for ${p.play_date}`);
    }
  }
}

seed();
