/** 초(楚)는 화면 아래쪽에서 먼저 두고, 한(漢)은 위쪽. */
export type Side = 'cho' | 'han';

/** K 궁, A 사, R 차, C 포, H 마, E 상, P 졸·병 */
export type PieceType = 'K' | 'A' | 'R' | 'C' | 'H' | 'E' | 'P';

export interface Piece {
  id: string;
  type: PieceType;
  side: Side;
}

/** x: 0~8 (왼→오), y: 0~9 (초 끝줄 → 한 끝줄) */
export interface Pos {
  x: number;
  y: number;
}

export interface Move {
  from: Pos;
  to: Pos;
}

/** 90칸, 인덱스 = y * 9 + x */
export type Board = (Piece | null)[];

/** 자기 쪽에서 본 왼→오 순서의 마·상 배치 */
export type Formation = '마상마상' | '상마상마' | '마상상마' | '상마마상';

export const other = (s: Side): Side => (s === 'cho' ? 'han' : 'cho');
