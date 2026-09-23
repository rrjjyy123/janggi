import { at, idx, posOf } from './board';
import { pseudoMoves } from './moves';
import type { Board, Move, Pos, Side } from './types';
import { other } from './types';

export function applyMove(b: Board, m: Move): Board {
  const nb = b.slice();
  nb[idx(m.to)] = nb[idx(m.from)];
  nb[idx(m.from)] = null;
  return nb;
}

export function findKing(b: Board, side: Side): Pos | null {
  const i = b.findIndex((p) => p?.type === 'K' && p.side === side);
  return i < 0 ? null : posOf(i);
}

/** by 쪽 말 중 target 을 잡을 수 있는 것이 있는지 */
export function isAttacked(b: Board, target: Pos, by: Side): boolean {
  for (let i = 0; i < b.length; i++) {
    const p = b[i];
    if (!p || p.side !== by) continue;
    if (pseudoMoves(b, posOf(i)).some((q) => q.x === target.x && q.y === target.y)) return true;
  }
  return false;
}

export function inCheck(b: Board, side: Side): boolean {
  const k = findKing(b, side);
  return !!k && isAttacked(b, k, other(side));
}

/**
 * 둘 수 있는 칸. 말의 움직임 규칙만 본다.
 * 장군을 못 본 척하거나 스스로 궁이 잡히는 자리로 가는 것도 두는 사람의 몫으로 남겨 둔다.
 */
export function legalMoves(b: Board, from: Pos): Pos[] {
  return at(b, from) ? pseudoMoves(b, from) : [];
}

export function hasAnyLegalMove(b: Board, side: Side): boolean {
  for (let i = 0; i < b.length; i++) {
    if (b[i]?.side === side && legalMoves(b, posOf(i)).length > 0) return true;
  }
  return false;
}
