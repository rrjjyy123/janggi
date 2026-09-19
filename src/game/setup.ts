import { emptyBoard, idx } from './board';
import type { Board, Formation, PieceType, Side } from './types';

const FORMATION_PIECES: Record<Formation, PieceType[]> = {
  마상마상: ['H', 'E', 'H', 'E'],
  상마상마: ['E', 'H', 'E', 'H'],
  마상상마: ['H', 'E', 'E', 'H'],
  상마마상: ['E', 'H', 'H', 'E'],
};

export const FORMATIONS = Object.keys(FORMATION_PIECES) as Formation[];
export const formationPieces = (f: Formation) => FORMATION_PIECES[f];

/**
 * 초는 아래(y=0 끝줄), 한은 위(y=9 끝줄). 한은 판을 180° 돌린 자리에 앉으므로
 * x 도 뒤집어서, 배치 이름이 각자 자기 눈으로 본 왼→오 순서가 되게 한다.
 */
export function initialBoard(cho: Formation, han: Formation): Board {
  const b = emptyBoard();
  let n = 0;
  const put = (side: Side, type: PieceType, x: number, y: number) => {
    const X = side === 'cho' ? x : 8 - x;
    const Y = side === 'cho' ? y : 9 - y;
    b[idx({ x: X, y: Y })] = { id: `${side}-${type}-${n++}`, type, side };
  };
  for (const side of ['cho', 'han'] as Side[]) {
    const f = FORMATION_PIECES[side === 'cho' ? cho : han];
    put(side, 'R', 0, 0);
    put(side, f[0], 1, 0);
    put(side, f[1], 2, 0);
    put(side, 'A', 3, 0);
    put(side, 'A', 5, 0);
    put(side, f[2], 6, 0);
    put(side, f[3], 7, 0);
    put(side, 'R', 8, 0);
    put(side, 'K', 4, 1);
    put(side, 'C', 1, 2);
    put(side, 'C', 7, 2);
    for (const x of [0, 2, 4, 6, 8]) put(side, 'P', x, 3);
  }
  return b;
}
