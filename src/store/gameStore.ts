import { create } from 'zustand';
import { at, idx, samePos } from '../game/board';
import { applyMove, hasAnyLegalMove, inCheck, legalMoves } from '../game/rules';
import { initialBoard } from '../game/setup';
import type { Board, Formation, Piece, Pos, Side } from '../game/types';
import { other } from '../game/types';

export type PieceStyle = 'hanja' | 'animal';
/** face: 마주 앉기(카메라 고정), rotate: 차례마다 판이 돌아감 */
export type ViewMode = 'face' | 'rotate';
export type Screen = 'start' | 'game';
export type Quality = 'high' | 'low';

const QUALITY_KEY = 'janggi3d.quality';
function loadQuality(): Quality {
  try {
    return localStorage.getItem(QUALITY_KEY) === 'low' ? 'low' : 'high';
  } catch {
    return 'high';
  }
}

export interface HistoryEntry {
  side: Side;
  from: Pos | null; // null = 한 수 쉬기
  to: Pos | null;
  captured: Piece | null;
}

export type Announcement =
  | { kind: 'check'; attacker: Side }
  | { kind: 'defended'; defender: Side }
  | { kind: 'pass'; side: Side }
  | { kind: 'mustPass'; side: Side };

export interface GameResult {
  winner: Side | null; // null = 무승부
  reason: 'captured' | 'resign' | 'draw';
}

interface State {
  screen: Screen;
  pieceStyle: PieceStyle;
  viewMode: ViewMode;
  sound: boolean;
  quality: Quality;
  formations: Record<Side, Formation>;

  board: Board;
  turn: Side;
  selected: Pos | null;
  targets: Pos[];
  history: HistoryEntry[];
  captured: Record<Side, Piece[]>; // side 가 잡은 상대 말
  checkedSide: Side | null;
  announcement: (Announcement & { key: number }) | null;
  result: GameResult | null;
  /** 규칙 카드: 어떤 말의 설명을 누구 쪽으로 보여줄지 */
  ruleCard: Piece | null;
  /** 상대 말을 누르는 등 잘못된 탭 → 흔들기 애니메이션 신호 */
  shake: { id: string; key: number } | null;

  setPieceStyle: (s: PieceStyle) => void;
  setViewMode: (m: ViewMode) => void;
  setSound: (on: boolean) => void;
  setQuality: (q: Quality) => void;
  setFormation: (side: Side, f: Formation) => void;
  startGame: () => void;
  backToStart: () => void;
  tapPoint: (p: Pos | null) => void;
  pass: () => void;
  resign: (side: Side) => void;
  showRuleCard: (piece: Piece | null) => void;
  clearAnnouncement: () => void;
}

let annKey = 0;

export const useGame = create<State>((set, get) => ({
  screen: 'start',
  pieceStyle: 'animal',
  viewMode: 'face',
  sound: true,
  quality: loadQuality(),
  formations: { cho: '마상마상', han: '마상마상' },

  board: initialBoard('마상마상', '마상마상'),
  turn: 'cho',
  selected: null,
  targets: [],
  history: [],
  captured: { cho: [], han: [] },
  checkedSide: null,
  announcement: null,
  result: null,
  ruleCard: null,
  shake: null,

  setPieceStyle: (pieceStyle) => set({ pieceStyle }),
  setViewMode: (viewMode) => set({ viewMode }),
  setSound: (sound) => set({ sound }),
  setQuality: (quality) => {
    try {
      localStorage.setItem(QUALITY_KEY, quality);
    } catch {
      /* 저장 못 해도 이번 판에는 적용 */
    }
    set({ quality });
  },
  setFormation: (side, f) =>
    set((s) => {
      const formations = { ...s.formations, [side]: f };
      // 처음 화면 뒤의 판에 고른 배치를 바로 보여준다
      return s.screen === 'start' ? { formations, board: initialBoard(formations.cho, formations.han) } : { formations };
    }),

  startGame: () => {
    const { formations } = get();
    set({
      screen: 'game',
      board: initialBoard(formations.cho, formations.han),
      turn: 'cho',
      selected: null,
      targets: [],
      history: [],
      captured: { cho: [], han: [] },
      checkedSide: null,
      announcement: null,
      result: null,
      ruleCard: null,
    });
  },

  backToStart: () => set({ screen: 'start', selected: null, targets: [], ruleCard: null }),

  tapPoint: (p) => {
    const s = get();
    if (s.result) return;
    if (!p) {
      set({ selected: null, targets: [] });
      return;
    }
    const piece = at(s.board, p);

    if (s.selected && s.targets.some((t) => samePos(t, p))) {
      doMove(s.selected, p);
      return;
    }
    if (piece && piece.side === s.turn) {
      if (s.selected && samePos(s.selected, p)) set({ selected: null, targets: [] });
      else set({ selected: p, targets: legalMoves(s.board, p) });
      return;
    }
    if (piece) set({ shake: { id: piece.id, key: Date.now() } });
    set({ selected: null, targets: [] });
  },

  pass: () => {
    const s = get();
    if (s.result) return;
    const history = [...s.history, { side: s.turn, from: null, to: null, captured: null }];
    const prev = s.history[s.history.length - 1];
    // 두 사람이 연달아 쉬면 더 둘 수 없는 판으로 보고 무승부
    if (prev && prev.from === null) {
      set({ history, selected: null, targets: [], result: { winner: null, reason: 'draw' } });
      return;
    }
    const next = other(s.turn);
    set({
      history,
      turn: next,
      selected: null,
      targets: [],
      announcement: { kind: 'pass', side: s.turn, key: ++annKey },
    });
    afterTurnChange(next);
  },

  resign: (side) => set({ result: { winner: other(side), reason: 'resign' }, selected: null, targets: [] }),

  showRuleCard: (ruleCard) => set({ ruleCard }),
  clearAnnouncement: () => set({ announcement: null }),
}));

function doMove(from: Pos, to: Pos) {
  const s = useGame.getState();
  const mover = s.turn;
  const captured = s.board[idx(to)];
  const board = applyMove(s.board, { from, to });
  const next = other(mover);
  const wasChecked = s.checkedSide === mover;
  const nowCheck = inCheck(board, next);

  let announcement: State['announcement'] = null;
  if (nowCheck) announcement = { kind: 'check', attacker: mover, key: ++annKey };
  else if (wasChecked) announcement = { kind: 'defended', defender: mover, key: ++annKey };

  // 궁이 실제로 잡혔을 때만 끝난다 (장군을 무시하고 두는 것도 둘 사람의 선택)
  const result: GameResult | null = captured?.type === 'K' ? { winner: mover, reason: 'captured' } : null;

  useGame.setState({
    board,
    turn: result ? mover : next,
    selected: null,
    targets: [],
    history: [...s.history, { side: mover, from, to, captured }],
    captured: captured ? { ...s.captured, [mover]: [...s.captured[mover], captured] } : s.captured,
    checkedSide: nowCheck ? next : null,
    announcement,
    result,
  });
  if (!result) afterTurnChange(next);
}

/** 둘 수 있는 수가 하나도 없으면 한 수 쉬어야 한다고 알려준다 */
function afterTurnChange(side: Side) {
  const s = useGame.getState();
  if (!hasAnyLegalMove(s.board, side)) {
    useGame.setState({ announcement: { kind: 'mustPass', side, key: ++annKey } });
  }
}
