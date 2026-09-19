import type { ReactNode } from 'react';
import type { Side } from '../game/types';
import { useGame } from '../store/gameStore';
import { Flip } from './common';

export function Toggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.value} data-on={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

const sub = (s: string) => <span className="block text-[12px] font-normal opacity-75">{s}</span>;

export const STYLE_OPTIONS = [
  { value: 'animal' as const, label: <>캐릭터 말{sub('역할별 복장의 동물')}</> },
  { value: 'hanja' as const, label: <>한자 말{sub('전통 팔각 원목알')}</> },
];

export const VIEW_OPTIONS = [
  { value: 'face' as const, label: <>마주 앉기{sub('위에서 보기 · 두 손가락 회전')}</> },
  { value: 'rotate' as const, label: <>차례마다 회전{sub('비스듬한 시점')}</> },
];

export const QUALITY_OPTIONS = [
  { value: 'high' as const, label: <>고화질</> },
  { value: 'low' as const, label: <>저사양 기기</> },
];

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[13px] tracking-wide text-[rgba(245,232,210,.55)]">{label}</div>
      {children}
    </div>
  );
}

/** 설정 창. 연 사람 쪽을 향해 열린다. */
export function SettingsMenu({ side, onClose }: { side: Side; onClose: () => void }) {
  const s = useGame();

  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/45 p-4" onClick={onClose}>
      <Flip side={side}>
        <div className="panel panel-in w-[min(92vw,460px)] space-y-4 p-6" onClick={(e) => e.stopPropagation()}>
          <div className="title text-center text-[26px] text-[#f3d08a]">설정</div>
          <Row label="말 모양">
            <Toggle value={s.pieceStyle} options={STYLE_OPTIONS} onChange={s.setPieceStyle} />
          </Row>
          <Row label="시점">
            <Toggle value={s.viewMode} options={VIEW_OPTIONS} onChange={s.setViewMode} />
          </Row>
          <Row label="화질">
            <Toggle value={s.quality} options={QUALITY_OPTIONS} onChange={s.setQuality} />
          </Row>
          <div className="flex gap-2">
            <button className="btn flex-1 py-3" onClick={() => s.setSound(!s.sound)}>
              효과음 {s.sound ? '켬' : '끔'}
            </button>
            <button className="btn flex-1 py-3" onClick={fullscreen}>
              전체 화면
            </button>
          </div>
          <div className="flex gap-2">
            <button
              className="btn flex-1 py-3"
              onClick={() => {
                s.backToStart();
                onClose();
              }}
            >
              처음 화면으로
            </button>
            <button className="btn btn-primary flex-1 py-3" onClick={onClose}>
              계속하기
            </button>
          </div>
        </div>
      </Flip>
    </div>
  );
}
