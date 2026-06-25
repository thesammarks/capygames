import type { Metadata } from "next";
import { Zen_Maru_Gothic, Zen_Kaku_Gothic_New } from "next/font/google";
import "./globals.css";

const zenMaru = Zen_Maru_Gothic({
  weight: ["500", "700"],
  subsets: ["latin"],
  variable: "--maru",
  display: "swap",
});

const zenKaku = Zen_Kaku_Gothic_New({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--kaku",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Capygames",
  description: "Daily puzzle games — Nonogram, Sudoku, Bridges, Kakuro",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${zenMaru.variable} ${zenKaku.variable}`}>
      <body>{children}</body>
    </html>
  );
}
