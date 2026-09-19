import type { PieceType, Side } from '../game/types';
import { useGame } from '../store/gameStore';
import { ANIMAL, HANGUL, HANJA, TEAM } from '../three/constants';
import { pieceThumbnail } from '../three/thumbnails';
import { HanjaChip, useFlipped } from './common';

/** 움직이는 법 설명 */
const TEXT: Record<PieceType, string[]> = {
  K: ['궁성(X자 선이 있는 칸) 안에서만 움직입니다.', '선을 따라 한 칸씩 갑니다.', '궁이 피할 곳 없이 잡히게 되면(외통) 집니다.'],
  A: ['궁을 곁에서 지키는 말입니다.', '궁처럼 궁성 안에서 선을 따라 한 칸씩 움직입니다.'],
  R: ['앞·뒤·옆으로 막히지 않았다면 몇 칸이든 곧게 갑니다.', '궁성 안에서는 X자 선을 따라서도 갑니다.', '가장 힘이 센 말입니다.'],
  C: ['반드시 다른 말 하나를 뛰어넘어야 움직일 수 있습니다.', '포는 포를 뛰어넘을 수도, 잡을 수도 없습니다.'],
  H: ['곧게 한 칸, 이어서 대각선으로 한 칸 갑니다. (日자 모양)', '처음 가는 칸이 막혀 있으면 그쪽으로 못 갑니다.'],
  E: ['곧게 한 칸, 이어서 대각선으로 두 칸 갑니다. (用자 모양)', '지나가는 칸에 말이 있으면 못 갑니다.'],
  P: ['앞이나 옆으로 한 칸씩 갑니다. 뒤로는 못 갑니다.', '상대 궁성에 들어가면 X자 선을 따라 대각선 앞으로도 갑니다.'],
};

type XY = [number, number];
interface Diagram {
  dots: XY[];
  paths?: XY[][];
  blockers?: XY[];
  crosses?: XY[];
  palace?: boolean;
  arrows?: XY[];
}

const PALACE8: XY[] = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

/** 7×7 미니 판, 가운데 (0,0)에 말. dy 가 음수면 앞(위쪽). */
const DIAGRAM: Record<PieceType, Diagram> = {
  K: { palace: true, dots: PALACE8 },
  A: { palace: true, dots: PALACE8 },
  R: {
    dots: [1, 2, 3].flatMap((d): XY[] => [[0, -d], [0, d], [-d, 0], [d, 0]]),
    arrows: [[0, -1], [0, 1], [-1, 0], [1, 0]],
  },
  C: { blockers: [[0, -1], [2, 0]], dots: [[0, -2], [0, -3], [3, 0]], crosses: [[-1, 0], [0, 1]] },
  H: {
    dots: [[1, -2], [-1, -2], [1, 2], [-1, 2], [2, 1], [2, -1], [-2, 1], [-2, -1]],
    paths: [
      [[0, 0], [0, -1], [1, -2]],
      [[0, 0], [0, -1], [-1, -2]],
      [[0, 0], [0, 1], [1, 2]],
      [[0, 0], [0, 1], [-1, 2]],
      [[0, 0], [1, 0], [2, 1]],
      [[0, 0], [1, 0], [2, -1]],
      [[0, 0], [-1, 0], [-2, 1]],
      [[0, 0], [-1, 0], [-2, -1]],
    ],
  },
  E: {
    dots: [[2, -3], [-2, -3], [2, 3], [-2, 3], [3, 2], [3, -2], [-3, 2], [-3, -2]],
    paths: [
      [[0, 0], [0, -1], [1, -2], [2, -3]],
      [[0, 0], [0, -1], [-1, -2], [-2, -3]],
      [[0, 0], [0, 1], [1, 2], [2, 3]],
      [[0, 0], [0, 1], [-1, 2], [-2, 3]],
      [[0, 0], [1, 0], [2, 1], [3, 2]],
      [[0, 0], [1, 0], [2, -1], [3, -2]],
      [[0, 0], [-1, 0], [-2, 1], [-3, 2]],
      [[0, 0], [-1, 0], [-2, -1], [-3, -2]],
    ],
  },
  P: { dots: [[0, -1], [-1, 0], [1, 0]], crosses: [[0, 1]] },
};

function Token({ type, side, cx, cy, r }: { type: PieceType; side: Side; cx: number; cy: number; r: number }) {
  const t = TEAM[side];
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={t.main} stroke="#f3d08a" strokeWidth={2} />
      <text
        x={cx}
        y={cy + 1}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={r * 1.15}
        fill="#fbe9c8"
        style={{ fontFamily: 'var(--font-hanja)', fontWeight: 900 }}
      >
        {HANJA[type][side]}
      </text>
    </g>
  );
}

function MiniBoard({ type, side }: { type: PieceType; side: Side }) {
  const S = 34;
  const O = S / 2;
  const at = (d: number) => O + (d + 3) * S;
  const d = DIAGRAM[type];
  const lines = [];
  for (let i = 0; i < 7; i++) {
    lines.push(<line key={`v${i}`} x1={at(i - 3)} y1={at(-3)} x2={at(i - 3)} y2={at(3)} />);
    lines.push(<line key={`h${i}`} x1={at(-3)} y1={at(i - 3)} x2={at(3)} y2={at(i - 3)} />);
  }
  const other: Side = side === 'cho' ? 'han' : 'cho';
  return (
    <svg
      viewBox={`0 0 ${S * 7} ${S * 7}`}
      className="h-[210px] w-[210px] shrink-0 rounded-xl"
      style={{ background: 'linear-gradient(160deg, #e2b980, #c99a5e)', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.2)' }}
    >
      <g stroke="#4a2c14" strokeWidth={1.4} opacity={0.8}>
        {lines}
      </g>
      {d.palace && (
        <g stroke="#4a2c14" strokeWidth={1.6} opacity={0.8}>
          <line x1={at(-1)} y1={at(-1)} x2={at(1)} y2={at(1)} />
          <line x1={at(1)} y1={at(-1)} x2={at(-1)} y2={at(1)} />
        </g>
      )}
      {d.paths?.map((p, i) => (
        <polyline
          key={i}
          points={p.map(([x, y]) => `${at(x)},${at(y)}`).join(' ')}
          fill="none"
          stroke="#1f7a45"
          strokeWidth={2.6}
          strokeDasharray="5 4"
          strokeLinecap="round"
          className="rule-path"
        />
      ))}
      {d.arrows?.map(([x, y], i) => (
        <line key={i} x1={at(x * 0.6)} y1={at(y * 0.6)} x2={at(x * 3)} y2={at(y * 3)} stroke="#1f7a45" strokeWidth={3.5} strokeLinecap="round" />
      ))}
      {d.blockers?.map(([x, y], i) => <Token key={i} type="P" side={other} cx={at(x)} cy={at(y)} r={12} />)}
      {d.dots.map(([x, y], i) => (
        <circle key={i} cx={at(x)} cy={at(y)} r={8} fill="#2fbf6c" stroke="#f5ffe8" strokeWidth={2} className="rule-dot" />
      ))}
      {d.crosses?.map(([x, y], i) => (
        <g key={i} stroke="#b8302c" strokeWidth={3.5} strokeLinecap="round">
          <line x1={at(x) - 7} y1={at(y) - 7} x2={at(x) + 7} y2={at(y) + 7} />
          <line x1={at(x) + 7} y1={at(y) - 7} x2={at(x) - 7} y2={at(y) + 7} />
        </g>
      ))}
      <Token type={type} side={side} cx={at(0)} cy={at(0)} r={15} />
    </svg>
  );
}

/** 말을 길게 누르면 나오는 움직임 설명 카드. 그 말 주인 쪽을 향해 열린다. */
export function RuleCard() {
  const piece = useGame((s) => s.ruleCard);
  const style = useGame((s) => s.pieceStyle);
  const close = useGame((s) => s.showRuleCard);
  const flipped = useFlipped(piece?.side ?? 'cho');
  if (!piece) return null;
  const t = TEAM[piece.side];
  const reading = piece.type === 'K' ? `${t.name} · 궁` : HANGUL[piece.type][piece.side];

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/45 p-4" onClick={() => close(null)}>
      <div style={{ transform: flipped ? 'rotate(180deg)' : undefined }}>
        <div className="panel panel-in flex max-w-[660px] flex-wrap items-center justify-center gap-5 p-5">
          <MiniBoard type={piece.type} side={piece.side} />
          <div className="min-w-[250px] flex-1">
            <div className="flex items-center gap-3">
              {style === 'animal' ? (
                <img src={pieceThumbnail(piece.type, piece.side, 'animal')} alt="" className="h-[84px] w-[84px]" />
              ) : (
                <HanjaChip type={piece.type} side={piece.side} size={64} />
              )}
              <div>
                <div className="title text-[30px] leading-tight" style={{ color: t.light }}>
                  <span style={{ fontFamily: 'var(--font-hanja)', fontWeight: 900 }}>{HANJA[piece.type][piece.side]}</span> {reading}
                </div>
                <div className="text-[14px] text-[rgba(245,232,210,.55)]">캐릭터 · {ANIMAL[piece.type].name}</div>
              </div>
            </div>
            <ul className="mt-3 space-y-1.5 text-[16px] leading-snug text-[rgba(245,232,210,.9)]">
              {TEXT[piece.type].map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="text-[#d6a85c]">·</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 text-[13px] text-[rgba(245,232,210,.45)]">
              <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[#2fbf6c] align-middle" /> 갈 수 있는 곳 · 아무 곳이나 누르면
              닫힙니다
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
