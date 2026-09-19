import { at, DIAG, isPalaceDiagonalStep, onBoard, ORTHO, palaceOf } from './board';
import type { Board, Pos } from './types';

const add = (p: Pos, dx: number, dy: number): Pos => ({ x: p.x + dx, y: p.y + dy });

/** 한 방향으로 곧게 나아가는 길. 대각선은 궁성 안의 선을 따라갈 때만 이어진다. */
function ray(from: Pos, dx: number, dy: number): Pos[] {
  const out: Pos[] = [];
  const diagonal = dx !== 0 && dy !== 0;
  let cur = from;
  for (;;) {
    const next = add(cur, dx, dy);
    if (!onBoard(next)) break;
    if (diagonal && !isPalaceDiagonalStep(cur, next)) break;
    out.push(next);
    cur = next;
  }
  return out;
}

const ALL_DIRS = [...ORTHO, ...DIAG];

/** 직선 1칸 뒤 바깥쪽 대각선 두 방향 */
const outwardDiagonals = (dx: number, dy: number): [number, number][] =>
  dx === 0
    ? [
        [1, dy],
        [-1, dy],
      ]
    : [
        [dx, 1],
        [dx, -1],
      ];

/**
 * 자기 궁이 잡히는지는 따지지 않은, 말의 움직임 규칙만 적용한 후보 칸.
 * (자기 말이 있는 칸은 제외, 상대 말이 있는 칸은 잡기)
 */
export function pseudoMoves(b: Board, from: Pos): Pos[] {
  const piece = at(b, from);
  if (!piece) return [];
  const { side, type } = piece;
  const out: Pos[] = [];
  const canLand = (p: Pos) => onBoard(p) && at(b, p)?.side !== side;

  switch (type) {
    case 'K':
    case 'A': {
      for (const [dx, dy] of ORTHO) {
        const p = add(from, dx, dy);
        if (palaceOf(p) === side && canLand(p)) out.push(p);
      }
      for (const [dx, dy] of DIAG) {
        const p = add(from, dx, dy);
        if (isPalaceDiagonalStep(from, p) && palaceOf(p) === side && canLand(p)) out.push(p);
      }
      break;
    }
    case 'R': {
      for (const [dx, dy] of ALL_DIRS) {
        for (const p of ray(from, dx, dy)) {
          const q = at(b, p);
          if (!q) out.push(p);
          else {
            if (q.side !== side) out.push(p);
            break;
          }
        }
      }
      break;
    }
    case 'C': {
      // 반드시 말 하나를 넘어야 하고, 포는 넘을 수도 잡을 수도 없다.
      for (const [dx, dy] of ALL_DIRS) {
        let jumped = false;
        for (const p of ray(from, dx, dy)) {
          const q = at(b, p);
          if (!jumped) {
            if (q) {
              if (q.type === 'C') break;
              jumped = true;
            }
          } else if (!q) out.push(p);
          else {
            if (q.side !== side && q.type !== 'C') out.push(p);
            break;
          }
        }
      }
      break;
    }
    case 'H': {
      for (const [dx, dy] of ORTHO) {
        const mid = add(from, dx, dy);
        if (!onBoard(mid) || at(b, mid)) continue;
        for (const [sx, sy] of outwardDiagonals(dx, dy)) {
          const p = add(mid, sx, sy);
          if (canLand(p)) out.push(p);
        }
      }
      break;
    }
    case 'E': {
      for (const [dx, dy] of ORTHO) {
        const mid1 = add(from, dx, dy);
        if (!onBoard(mid1) || at(b, mid1)) continue;
        for (const [sx, sy] of outwardDiagonals(dx, dy)) {
          const mid2 = add(mid1, sx, sy);
          if (!onBoard(mid2) || at(b, mid2)) continue;
          const p = add(mid2, sx, sy);
          if (canLand(p)) out.push(p);
        }
      }
      break;
    }
    case 'P': {
      const fwd = side === 'cho' ? 1 : -1;
      for (const [dx, dy] of [
        [0, fwd],
        [1, 0],
        [-1, 0],
      ]) {
        const p = add(from, dx, dy);
        if (canLand(p)) out.push(p);
      }
      // 상대 궁성 안에서는 궁성 대각선을 따라 앞으로도 갈 수 있다.
      for (const dx of [1, -1]) {
        const p = add(from, dx, fwd);
        if (isPalaceDiagonalStep(from, p) && canLand(p)) out.push(p);
      }
      break;
    }
  }
  return out;
}
