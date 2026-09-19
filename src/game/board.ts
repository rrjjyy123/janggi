import type { Board, Piece, Pos, Side } from './types';

export const COLS = 9;
export const ROWS = 10;

export const idx = (p: Pos) => p.y * COLS + p.x;
export const posOf = (i: number): Pos => ({ x: i % COLS, y: Math.floor(i / COLS) });
export const onBoard = (p: Pos) => p.x >= 0 && p.x < COLS && p.y >= 0 && p.y < ROWS;
export const samePos = (a: Pos, b: Pos) => a.x === b.x && a.y === b.y;
export const at = (b: Board, p: Pos): Piece | null => (onBoard(p) ? b[idx(p)] : null);

/** 궁성 가운데 점 */
export const palaceCenter = (s: Side): Pos => (s === 'cho' ? { x: 4, y: 1 } : { x: 4, y: 8 });

/** 그 점이 속한 궁성 (없으면 null) */
export function palaceOf(p: Pos): Side | null {
  if (p.x < 3 || p.x > 5) return null;
  if (p.y >= 0 && p.y <= 2) return 'cho';
  if (p.y >= 7 && p.y <= 9) return 'han';
  return null;
}

/** a → b 가 궁성 안의 대각선 한 칸인지: 같은 궁성이고 둘 중 하나가 가운데 점 */
export function isPalaceDiagonalStep(a: Pos, b: Pos): boolean {
  if (Math.abs(a.x - b.x) !== 1 || Math.abs(a.y - b.y) !== 1) return false;
  const pa = palaceOf(a);
  if (!pa || pa !== palaceOf(b)) return false;
  const c = palaceCenter(pa);
  return samePos(a, c) || samePos(b, c);
}

export const ORTHO: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
export const DIAG: [number, number][] = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

export const emptyBoard = (): Board => new Array(COLS * ROWS).fill(null);
