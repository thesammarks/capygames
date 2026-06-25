export const RULES: Record<string, string> = {
  nonogram:
    "Fill cells to match the row and column clues. Each number is the length of a run of filled squares, in order.",
  nonomini:
    "A bite-size 5×5 nonogram. The clues give the run lengths, in order — same rules, quicker solve.",
  sudoku: "Fill every row, column and 3×3 box with the digits 1–9, with no repeats.",
  bridges:
    "Join the islands with bridges. Each island needs exactly its number of bridges; at most two between a pair, none crossing, and all islands connected.",
  kakuro:
    "Fill the white cells with 1–9 so each run adds up to its clue. No digit repeats within a run.",
};

export interface GameMeta {
  id: string;
  name: string;
  jp: string;
  desc: string;
  live: boolean;
  glyph: string; // raw SVG string for the tile icon
}

export const GAMES: GameMeta[] = [
  {
    id: "nonogram",
    name: "Nonogram",
    jp: "ノノグラム",
    desc: "Use the number clues to uncover a hidden picture.",
    live: true,
    glyph: `<svg width="34" height="34" viewBox="0 0 34 34"><g fill="#241E18"><rect x="6" y="2" width="6" height="6" rx="1"/><rect x="22" y="2" width="6" height="6" rx="1"/><rect x="2" y="10" width="30" height="6" rx="1"/><rect x="2" y="18" width="30" height="6" rx="1"/><rect x="9" y="26" width="16" height="6" rx="1"/></g></svg>`,
  },
  {
    id: "nonomini",
    name: "Nonomini",
    jp: "ミニ",
    desc: "A bite-size 5×5 nonogram — same idea, quicker solve.",
    live: true,
    glyph: `<svg width="34" height="34" viewBox="0 0 34 34"><g fill="#241E18"><rect x="9" y="6" width="7" height="7" rx="1.4"/><rect x="6" y="15" width="16" height="7" rx="1.4"/><rect x="11" y="24" width="9" height="7" rx="1.4"/></g></svg>`,
  },
  {
    id: "sudoku",
    name: "Sudoku",
    jp: "数独",
    desc: "Fill the grid so every row, column and box holds 1–9.",
    live: true,
    glyph: `<svg width="34" height="34" viewBox="0 0 34 34" font-family="Zen Kaku Gothic New" font-weight="700" font-size="11" fill="#241E18"><rect x="1.5" y="1.5" width="31" height="31" rx="3" fill="none" stroke="#241E18" stroke-width="1.6"/><line x1="12" y1="2" x2="12" y2="32" stroke="#D8D2C5"/><line x1="22.5" y1="2" x2="22.5" y2="32" stroke="#D8D2C5"/><line x1="2" y1="12" x2="32" y2="12" stroke="#D8D2C5"/><line x1="2" y1="22.5" x2="32" y2="22.5" stroke="#D8D2C5"/><text x="6" y="10">5</text><text x="27" y="20.5">3</text><text x="16" y="30">8</text></svg>`,
  },
  {
    id: "bridges",
    name: "Bridges",
    jp: "橋をかけろ",
    desc: "Connect the islands so the bridge counts all match.",
    live: true,
    glyph: `<svg width="34" height="34" viewBox="0 0 34 34"><g stroke="#F2922B" stroke-width="2"><line x1="7" y1="7" x2="7" y2="27"/><line x1="7" y1="9" x2="27" y2="9"/><line x1="9" y1="11" x2="25" y2="11"/></g><g fill="#241E18"><circle cx="7" cy="7" r="4.4"/><circle cx="27" cy="7" r="4.4"/><circle cx="7" cy="27" r="4.4"/></g></svg>`,
  },
  {
    id: "kakuro",
    name: "Kakuro",
    jp: "カックロ",
    desc: "A number crossword — entries add up to the clues.",
    live: true,
    glyph: `<svg width="34" height="34" viewBox="0 0 34 34" font-family="Zen Kaku Gothic New" font-weight="700" font-size="8" fill="#fff"><rect x="2" y="2" width="14" height="14" fill="#241E18"/><line x1="2" y1="2" x2="16" y2="16" stroke="#6E665B"/><text x="9.5" y="13">16</text><text x="4" y="8">\</text><rect x="18" y="2" width="14" height="14" rx="2" fill="none" stroke="#D8D2C5" stroke-width="1.4"/><rect x="2" y="18" width="14" height="14" rx="2" fill="none" stroke="#D8D2C5" stroke-width="1.4"/><rect x="18" y="18" width="14" height="14" rx="2" fill="none" stroke="#D8D2C5" stroke-width="1.4"/></svg>`,
  },
];
