import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { PieceType, Side } from '../game/types';
import { computeLayout } from '../layout';
import { useGame, type PieceStyle } from '../store/gameStore';
import { HANJA, TEAM } from '../three/constants';
import { pieceThumbnail } from '../three/thumbnails';

export function useViewport() {
  const read = () => ({ w: window.innerWidth, h: window.innerHeight });
  const [v, setV] = useState(read);
  useEffect(() => {
    const on = () => setV(read());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return { ...v, ...computeLayout(v.w, v.h) };
}

/** 마주 앉기 모드에서 한 쪽 화면은 180° 돌려서 맞은편 사람이 바로 읽게 한다 */
export function useFlipped(side: Side) {
  const viewMode = useGame((s) => s.viewMode);
  return viewMode === 'face' && side === 'han';
}

export function Flip({ side, children, className, style }: { side: Side; children: ReactNode; className?: string; style?: CSSProperties }) {
  const flipped = useFlipped(side);
  return (
    <div className={className} style={{ ...style, transform: flipped ? 'rotate(180deg)' : undefined }}>
      {children}
    </div>
  );
}

/** 팔각 한자알 모양 (CSS) */
export function HanjaChip({ type, side, size }: { type: PieceType; side: Side; size: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center leading-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.58,
        fontFamily: 'var(--font-hanja)',
        fontWeight: 900,
        color: TEAM[side].text,
        background: 'radial-gradient(circle at 35% 30%, #f3d7a8, #d4a86c)',
        clipPath: 'polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%)',
      }}
    >
      {HANJA[type][side]}
    </span>
  );
}

/** 작은 말 표시 (잡은 말·상차림 미리보기). 캐릭터 말은 실제 3D 초상화. */
export function PieceChip({ type, side, style, size = 30 }: { type: PieceType; side: Side; style: PieceStyle; size?: number }) {
  if (style === 'hanja') return <HanjaChip type={type} side={side} size={size} />;
  return (
    <img
      src={pieceThumbnail(type, side, style)}
      width={size}
      height={size}
      alt=""
      draggable={false}
      className="shrink-0"
      style={{ width: size, height: size, filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.5))' }}
    />
  );
}

/** 팀 인장: 팀 색 원에 楚/漢 */
export function TeamSeal({ side, size = 40 }: { side: Side; size?: number }) {
  const t = TEAM[side];
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full leading-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.55,
        fontFamily: 'var(--font-hanja)',
        fontWeight: 900,
        color: '#fbe9c8',
        background: `radial-gradient(circle at 35% 30%, ${t.light}, ${t.main} 55%, ${t.dark})`,
        boxShadow: 'inset 0 -3px 6px rgba(0,0,0,.35), inset 0 2px 3px rgba(255,255,255,.25), 0 2px 6px rgba(0,0,0,.4)',
      }}
    >
      {t.hanja}
    </span>
  );
}
