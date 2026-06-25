"use client";

import { useEffect, useRef, useState } from "react";
import { fmt } from "@/lib/daily";

interface Props {
  startedAt: number | null; // Date.now() when started, null if not yet
  paused?: boolean;
}

export default function GameClock({ startedAt, paused }: Props) {
  const [display, setDisplay] = useState("0:00");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (!startedAt || paused) return;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setDisplay(fmt(elapsed));
    };
    tick();
    intervalRef.current = setInterval(tick, 500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startedAt, paused]);

  return (
    <span
      style={{
        fontFamily: "var(--kaku)",
        fontVariantNumeric: "tabular-nums",
        fontSize: "0.9rem",
        color: "var(--ink-soft)",
      }}
    >
      {display}
    </span>
  );
}
