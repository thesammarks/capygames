import type { Metadata, Viewport } from "next";
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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://capygames.app";
const DESCRIPTION =
  "Five free daily puzzle games — Nonogram, Nonomini, Sudoku, Bridges, and Kakuro. A new puzzle every day.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Capygames",
    template: "%s · Capygames",
  },
  description: DESCRIPTION,
  keywords: ["nonogram", "nonomini", "sudoku", "kakuro", "bridges", "daily puzzle", "puzzle game"],
  authors: [{ name: "Capysoft" }],
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    siteName: "Capygames",
    title: "Capygames — Daily Puzzle Games",
    description: DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary",
    title: "Capygames — Daily Puzzle Games",
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#F2922B",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${zenMaru.variable} ${zenKaku.variable}`} suppressHydrationWarning>
      <head>
        {/* Anti-FOUC: apply stored theme before first paint */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('capygames-theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
