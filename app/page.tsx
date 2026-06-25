import Link from "next/link";
import { GAMES } from "@/lib/rules";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/favicon.svg" alt="" className={styles.logo} />
        <h1 className={styles.title}>
          Capy<span>games</span>
        </h1>
      </header>

      <div className={styles.hero}>
        <p className={styles.eyebrow}>Daily · Puzzle</p>
        <p className={styles.heroHead}>Five puzzles, every day.</p>
        <p className={styles.heroSub}>
          Free, ad-free, one puzzle per game per day.
        </p>
      </div>

      <section className={styles.grid}>
        {GAMES.map((g) => (
          <Link key={g.id} href={`/play/${g.id}`} className={styles.tile}>
            <div className={styles.tileTop}>
              <div
                className={styles.glyph}
                dangerouslySetInnerHTML={{ __html: g.glyph }}
              />
            </div>
            <div className={styles.tileName}>
              {g.name}
              <span className={styles.tileJp}>{g.jp}</span>
            </div>
            <p className={styles.tileDesc}>{g.desc}</p>
            <div className={styles.tileStatus}>
              <span className={styles.dotmark} />
              <span>New</span>
              <span className={styles.play}>Play →</span>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
