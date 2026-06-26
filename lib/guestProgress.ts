export interface GuestGameProgress {
  status: "in_progress" | "solved";
  duration_seconds: number | null;
  startedAt?: number;
}

const key = (date: string) => `cg_daily_${date}`;

export function getGuestProgress(date: string): Record<string, GuestGameProgress> {
  try {
    const raw = localStorage.getItem(key(date));
    return raw ? (JSON.parse(raw) as Record<string, GuestGameProgress>) : {};
  } catch {
    return {};
  }
}

export function setGuestProgress(
  date: string,
  game: string,
  status: GuestGameProgress["status"],
  duration_seconds: number | null,
  startedAt?: number,
) {
  try {
    const existing = getGuestProgress(date);
    // Only upgrade: in_progress → solved, never downgrade
    if (existing[game]?.status === "solved" && status === "in_progress") return;
    existing[game] = {
      status,
      duration_seconds,
      // Keep existing startedAt unless a new one is provided
      startedAt: startedAt ?? existing[game]?.startedAt,
    };
    localStorage.setItem(key(date), JSON.stringify(existing));
  } catch {
    // ignore — private browsing, quota exceeded, etc.
  }
}

export async function migrateGuestProgress(date: string): Promise<void> {
  try {
    const raw = localStorage.getItem(key(date));
    if (!raw) return;
    await fetch("/api/migrate-guest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, progress: JSON.parse(raw) }),
    });
    localStorage.removeItem(key(date));
  } catch {
    // Non-critical — migration can be retried on next sign-in
  }
}
