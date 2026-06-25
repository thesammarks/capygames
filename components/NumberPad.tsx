"use client";

import styles from "./NumberPad.module.css";

interface Props {
  onDigit: (n: number) => void;
  onErase: () => void;
  disabled?: boolean;
  counts?: number[]; // counts[1..9] — dim when all 9 placed
}

export default function NumberPad({ onDigit, onErase, disabled, counts }: Props) {
  return (
    <div className={styles.pad}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
        const full = counts ? counts[n] >= 9 : false;
        return (
          <button
            key={n}
            className={styles.digit}
            onClick={() => onDigit(n)}
            disabled={disabled || full}
            aria-label={`Enter ${n}`}
          >
            {n}
          </button>
        );
      })}
      <button
        className={`${styles.digit} ${styles.erase}`}
        onClick={onErase}
        disabled={disabled}
        aria-label="Erase"
      >
        ⌫
      </button>
    </div>
  );
}
