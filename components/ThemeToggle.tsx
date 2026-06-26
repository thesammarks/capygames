"use client";

import { useEffect, useState } from "react";
import styles from "./ThemeToggle.module.css";

type Theme = "system" | "light" | "dark";
const KEY = "capygames-theme";

function applyTheme(t: Theme) {
  if (t === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", t);
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    if (stored === "light" || stored === "dark") setTheme(stored);
  }, []);

  function cycle() {
    const next: Theme = theme === "system" ? "dark" : theme === "dark" ? "light" : "system";
    setTheme(next);
    if (next === "system") {
      localStorage.removeItem(KEY);
    } else {
      localStorage.setItem(KEY, next);
    }
    applyTheme(next);
  }

  const label = theme === "dark" ? "Dark" : theme === "light" ? "Light" : "Auto";

  return (
    <button
      onClick={cycle}
      className={styles.toggle}
      title={`Theme: ${label} — click to cycle`}
      aria-label={`Theme: ${label}`}
    >
      {theme === "light" ? <SunIcon /> : theme === "dark" ? <MoonIcon /> : <SystemIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="2.6" fill="currentColor" />
      <path
        d="M8.5 1.5V3M8.5 14V15.5M1.5 8.5H3M14 8.5H15.5M3.5 3.5L4.56 4.56M12.44 12.44L13.5 13.5M3.5 13.5L4.56 12.44M12.44 4.56L13.5 3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="currentColor" aria-hidden="true">
      <path d="M14.2 10A6 6 0 0 1 7 2.8a6.5 6.5 0 1 0 7.2 7.2Z" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="currentColor" aria-hidden="true">
      {/* right half filled = "auto: could be either" */}
      <path d="M8.5 2.5 A6 6 0 0 1 8.5 14.5 Z" />
      <circle cx="8.5" cy="8.5" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
