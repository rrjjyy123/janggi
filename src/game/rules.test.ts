import { describe, expect, it } from 'vitest';
import { emptyBoard, idx } from './board';
import { pseudoMoves } from './moves';
import { hasAnyLegalMove, inCheck, isCheckmate, legalMoves } from './rules';
import { initialBoard } from './setup';
import type { Board, PieceType, Pos, Side } from './types';

let n = 0;
function place(b: Board, side: Side, type: PieceType, x: number, y: number) {
  b[idx({ x, y })] = { id: `t${n++}`, type, side };
}
const has = (list: Pos[], x: number, y: number) => list.some((p) => p.x === x && p.y === y);
const sorted = (list: Pos[]) => list.map((p) => `${p.x},${p.y}`).sort();

/** 양쪽 궁을 서로 영향 없는 자리에 두고 시작 */
function withKings(): Board {
  const b = emptyBoard();
  place(b, 'cho', 'K', 4, 1);
  place(b, 'han', 'K', 5, 9);
  return b;
}

describe('초기 배치', () => {
  it('양쪽 16개씩, 한은 180° 돌린 자리', () => {
    const b = initialBoard('마상마상', '마상마상');
    expect(b.filter((p) => p?.side === 'cho')).toHaveLength(16);
    expect(b.filter((p) => p?.side === 'han')).toHaveLength(16);
    expect(b[idx({ x: 1, y: 0 })]?.type).toBe('H');
    expect(b[idx({ x: 7, y: 9 })]?.type).toBe('H'); // 한의 왼쪽 첫 칸
    expect(b[idx({ x: 4, y: 8 })]?.type).toBe('K');
  });
  it('처음에는 장군이 아니고 둘 수 있는 수가 있다', () => {
    const b = initialBoard('상마상마', '마상상마');
    expect(inCheck(b, 'cho')).toBe(false);
    expect(hasAnyLegalMove(b, 'cho')).toBe(true);
  });
});

describe('포', () => {
  it('말 하나를 넘어야 움직인다', () => {
    const b = withKings();
    place(b, 'cho', 'C', 0, 0);
    expect(pseudoMoves(b, { x: 0, y: 0 })).toHaveLength(0);
    place(b, 'cho', 'P', 0, 3);
    const m = pseudoMoves(b, { x: 0, y: 0 });
    expect(has(m, 0, 4)).toBe(true);
    expect(has(m, 0, 2)).toBe(false);
  });
  it('포는 넘을 수 없고 잡을 수도 없다', () => {
    const b = withKings();
    place(b, 'cho', 'C', 0, 0);
    place(b, 'han', 'C', 0, 3);
    expect(pseudoMoves(b, { x: 0, y: 0 })).toHaveLength(0);
    place(b, 'cho', 'P', 0, 2);
    const m = pseudoMoves(b, { x: 0, y: 0 });
    expect(has(m, 0, 3)).toBe(false);
  });
  it('궁성 대각선으로 넘는다', () => {
    const b = withKings();
    place(b, 'cho', 'C', 3, 7);
    expect(has(pseudoMoves(b, { x: 3, y: 7 }), 5, 9)).toBe(false); // 넘을 말이 없음
    place(b, 'cho', 'P', 4, 8);
    expect(has(pseudoMoves(b, { x: 3, y: 7 }), 5, 9)).toBe(true); // 한 궁 잡기
  });
});

describe('마·상 멱', () => {
  it('마는 첫 칸이 막히면 그쪽으로 못 간다', () => {
    const b = withKings();
    place(b, 'cho', 'H', 4, 4);
    expect(pseudoMoves(b, { x: 4, y: 4 })).toHaveLength(8);
    place(b, 'han', 'P', 4, 5);
    const m = pseudoMoves(b, { x: 4, y: 4 });
    expect(m).toHaveLength(6);
    expect(has(m, 3, 6)).toBe(false);
    expect(has(m, 5, 6)).toBe(false);
  });
  it('상은 지나는 두 칸 중 하나라도 막히면 못 간다', () => {
    const b = withKings();
    place(b, 'cho', 'E', 4, 4);
    expect(pseudoMoves(b, { x: 4, y: 4 })).toHaveLength(8);
    place(b, 'han', 'P', 5, 6); // 위→오른쪽 대각의 두 번째 칸
    const m = pseudoMoves(b, { x: 4, y: 4 });
    expect(has(m, 6, 7)).toBe(false);
    expect(has(m, 2, 7)).toBe(true);
  });
});

describe('궁성', () => {
  it('궁은 궁성 가운데에서 8방향, 궁성 밖으로 못 나간다', () => {
    const b = emptyBoard();
    place(b, 'cho', 'K', 4, 1);
    place(b, 'han', 'K', 3, 9);
    expect(pseudoMoves(b, { x: 4, y: 1 })).toHaveLength(8);
    const b2 = emptyBoard();
    place(b2, 'cho', 'K', 3, 1);
    place(b2, 'han', 'K', 3, 9);
    expect(sorted(pseudoMoves(b2, { x: 3, y: 1 }))).toEqual(sorted([
      { x: 3, y: 0 },
      { x: 3, y: 2 },
      { x: 4, y: 1 },
    ]));
  });
  it('차는 궁성 대각선을 따라 달린다', () => {
    const b = withKings();
    place(b, 'cho', 'R', 3, 7);
    const m = pseudoMoves(b, { x: 3, y: 7 });
    expect(has(m, 4, 8)).toBe(true);
    expect(has(m, 5, 9)).toBe(true); // 한 궁 잡기
  });
  it('졸은 상대 궁성에서 대각선 앞으로 간다', () => {
    const b = withKings();
    place(b, 'cho', 'P', 3, 7);
    const m = pseudoMoves(b, { x: 3, y: 7 });
    expect(has(m, 4, 8)).toBe(true);
    expect(has(m, 3, 6)).toBe(false); // 뒤로는 못 감
  });
});

describe('장군·외통', () => {
  it('자기 궁이 잡히는 수는 둘 수 없다', () => {
    const b = emptyBoard();
    place(b, 'cho', 'K', 4, 0);
    place(b, 'cho', 'A', 4, 1);
    place(b, 'han', 'R', 4, 5);
    place(b, 'han', 'K', 3, 9);
    const m = legalMoves(b, { x: 4, y: 1 });
    expect(m.every((p) => p.x === 4)).toBe(true); // 줄을 떠나면 차가 궁을 잡음
  });
  it('차 두 대 외통', () => {
    const b = emptyBoard();
    place(b, 'han', 'K', 4, 9);
    place(b, 'cho', 'K', 4, 0);
    place(b, 'cho', 'R', 0, 9); // 끝줄 장군
    place(b, 'cho', 'R', 1, 8); // 둘째 줄 막기
    expect(inCheck(b, 'han')).toBe(true);
    expect(isCheckmate(b, 'han')).toBe(true);
  });
  it('막을 수 있으면 외통이 아니다', () => {
    const b = emptyBoard();
    place(b, 'han', 'K', 4, 9);
    place(b, 'han', 'A', 3, 8);
    place(b, 'cho', 'K', 4, 0);
    place(b, 'cho', 'R', 0, 9);
    place(b, 'cho', 'R', 1, 8);
    expect(inCheck(b, 'han')).toBe(true);
    expect(isCheckmate(b, 'han')).toBe(false); // 사가 3,9 로 막음
  });
});
