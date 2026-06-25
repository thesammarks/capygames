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

const puzzles = [
  {
    game: "sudoku",
    play_date: todayUTC(),
    difficulty: "medium",
    data: {
      // 0 = empty cell — this is a valid classic Sudoku puzzle
      clues: "530070000600195000098000060800060003400803001700020006060000280000419005000080079",
    },
    solution: {
      // Server-only, never sent to client
      answer: "534678912672195348198342567859761423426853791713924856961537284287419635345286179",
    },
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
