import { useEffect, useState, type CSSProperties } from 'react';
import type { Side } from '../game/types';
import { useGame } from '../store/gameStore';
import { TEAM } from '../three/constants';
import { PieceChip, TeamSeal, useFlipped, useViewport } from './common';

/**
 * 각 플레이어 앞에 놓이는 패널: 차례, 잡은 말, 한 수 쉬기·기권·말 모양·설정.
 * bottom=true 면 화면 아래(가로 화면은 오른쪽 아래), 아니면 위(왼쪽 위).
 */
export function PlayerPanel({ side, bottom, onMenu }: { side: Side; bottom: boolean; onMenu: () => void }) {
  const vp = useViewport();
  const flipped = useFlipped(side);
  const turn = useGame((s) => s.turn);
  const checked = useGame((s) => s.checked[side]);
  const captured = useGame((s) => s.captured[side]);
  const result = useGame((s) => s.result);
  const pieceStyle = useGame((s) => s.pieceStyle);
  const setPieceStyle = useGame((s) => s.setPieceStyle);
  const pass = useGame((s) => s.pass);
  const resign = useGame((s) => s.resign);
  const [confirmResign, setConfirmResign] = useState(false);

  const myTurn = turn === side && !result;
  const t = TEAM[side];

  useEffect(() => {
    if (!confirmResign) return;
    const id = setTimeout(() => setConfirmResign(false), 3000);
    return () => clearTimeout(id);
  }, [confirmResign]);

  const pos: CSSProperties = vp.landscape
    ? bottom
      ? { right: 10, bottom: 10, width: vp.padX - 20 }
      : { left: 10, top: 10, width: vp.padX - 20 }
    : bottom
      ? { left: 10, right: 10, bottom: 10, height: vp.padY - 16 }
      : { left: 10, right: 10, top: 10, height: vp.padY - 16 };

  const status = result
    ? result.winner === side
      ? { text: '승리', color: '#f3d08a' }
      : result.winner
        ? { text: '패배', color: 'rgba(245,232,210,.55)' }
        : { text: '무승부', color: '#f5e8d2' }
    : checked
      ? { text: myTurn ? '장군을 받았습니다' : '궁이 위험합니다', color: '#ff8a7a' }
      : myTurn
        ? { text: '둘 차례', color: '#f3d08a' }
        : { text: '상대 차례', color: 'rgba(245,232,210,.5)' };

  return (
    <div
      className={`panel absolute flex gap-2.5 p-3 transition-[border-color,opacity] duration-300 ${
        vp.landscape ? 'flex-col' : 'flex-row items-center'
      }`}
      style={{
        ...pos,
        transform: flipped ? 'rotate(180deg)' : undefined,
        borderColor: myTurn ? (checked ? '#ff8a7a' : '#f3d08a') : undefined,
        animation: myTurn ? 'turnGlow 2s ease-in-out infinite' : undefined,
        opacity: myTurn || result ? 1 : 0.82,
      }}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <TeamSeal side={side} size={42} />
        <div className="min-w-0">
          <div className="title whitespace-nowrap text-[21px] leading-tight" style={{ color: t.light }}>
            {t.name}
            <span className="ml-1.5 text-[14px] font-normal text-[rgba(245,232,210,.55)]">{side === 'cho' ? '선수' : '후수'}</span>
          </div>
          <div className="whitespace-nowrap text-[14px] font-medium" style={{ color: status.color }}>
            {status.text}
          </div>
        </div>
      </div>

      <div className={`flex flex-wrap content-start gap-0.5 overflow-hidden ${vp.landscape ? 'min-h-[32px]' : 'max-h-full flex-1'}`}>
        {captured.map((p) => (
          <PieceChip key={p.id} type={p.type} side={p.side} style={pieceStyle} size={vp.landscape ? 32 : 28} />
        ))}
      </div>

      <div className={`flex gap-1.5 ${vp.landscape ? 'flex-wrap' : 'shrink-0'}`}>
        <button className="btn" disabled={!myTurn} onClick={pass}>
          한 수 쉬기
        </button>
        <button
          className={`btn ${confirmResign ? 'btn-danger' : ''}`}
          disabled={!!result}
          onClick={() => (confirmResign ? (resign(side), setConfirmResign(false)) : setConfirmResign(true))}
        >
          {confirmResign ? '기권 확인' : '기권'}
        </button>
        <button className="btn" onClick={() => setPieceStyle(pieceStyle === 'animal' ? 'hanja' : 'animal')}>
          {pieceStyle === 'animal' ? '한자 말' : '캐릭터 말'}
        </button>
        <button className="btn" onClick={onMenu} aria-label="설정">
          설정
        </button>
      </div>
    </div>
  );
}
