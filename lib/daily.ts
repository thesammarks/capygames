// All dates are UTC — this timezone is locked forever, do not change
export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

// Launch dates per game — used to compute "Daily #N"
const LAUNCH_DATES: Record<string, string> = {
  sudoku: "2025-01-01",
  nonogram: "2025-01-01",
  nonomini: "2025-01-01",
  bridges: "2025-01-01",
  kakuro: "2025-01-01",
};

export function dailyNumber(game: string, playDate: string): number {
  const launch = LAUNCH_DATES[game] ?? "2025-01-01";
  const msPerDay = 86400000;
  const diff =
    new Date(playDate).getTime() - new Date(launch).getTime();
  return Math.floor(diff / msPerDay) + 1;
}

export function fmt(seconds: number): string {
  return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
}
