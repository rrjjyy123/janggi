import { useEffect } from 'react';
import { other, type Side } from '../game/types';
import { useGame, type Announcement } from '../store/gameStore';
import { TEAM } from '../three/constants';

function content(a: Announcement): { big: string; small: string; color: string } {
  switch (a.kind) {
    case 'check':
      return { big: '장군', small: `${TEAM[other(a.attacker)].name}의 궁이 공격받고 있습니다 — 피하지 않으면 잡힙니다`, color: TEAM[a.attacker].light };
    case 'defended':
      return { big: '멍군', small: '장군을 막았습니다', color: TEAM[a.defender].light };
    case 'pass':
      return { big: '한 수 쉼', small: `${a.side === 'cho' ? '초가' : '한이'} 차례를 넘겼습니다`, color: '#f3d08a' };
    case 'mustPass':
      return { big: '둘 수 있는 수가 없습니다', small: `${a.side === 'cho' ? '초는' : '한은'} '한 수 쉬기'를 누르세요`, color: '#f3d08a' };
  }
}

/** 화면을 가로지르는 띠 알림. 마주 앉기 모드에서는 양쪽 방향으로 하나씩. */
export function CheckBanner() {
  const ann = useGame((s) => s.announcement);
  const viewMode = useGame((s) => s.viewMode);
  const clear = useGame((s) => s.clearAnnouncement);
  const dur = ann?.kind === 'mustPass' ? 3.2 : 1.9;

  useEffect(() => {
    if (!ann) return;
    const id = setTimeout(clear, dur * 1000);
    return () => clearTimeout(id);
  }, [ann, clear, dur]);

  if (!ann) return null;
  const c = content(ann);
  const long = c.big.length > 4;
  const one = (flip: boolean) => (
    <div key={`${ann.key}-${flip}`} className="w-full" style={{ transform: flip ? 'rotate(180deg)' : undefined }}>
      <div
        className="w-full py-3 text-center"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(20,12,8,.88) 25%, rgba(20,12,8,.88) 75%, transparent)',
          borderTop: '1px solid rgba(214,168,92,.35)',
          borderBottom: '1px solid rgba(214,168,92,.35)',
          animation: `bannerIn ${dur}s ease-out both`,
        }}
      >
        <div
          className="title leading-none"
          style={{
            fontSize: long ? 34 : 58,
            color: c.color,
            textShadow: `0 0 18px color-mix(in srgb, ${c.color} 70%, transparent), 0 2px 4px rgba(0,0,0,.6)`,
          }}
        >
          {c.big}
        </div>
        <div className="mt-1.5 text-[16px] text-[rgba(245,232,210,.8)]">{c.small}</div>
      </div>
    </div>
  );

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-[14vh]">
      {viewMode === 'face' ? [one(true), one(false)] : one(false)}
    </div>
  );
}

/** 승패가 나면 결과와 다시 두기 버튼 (마주 앉기 모드에서는 양쪽에 하나씩) */
export function ResultOverlay() {
  const result = useGame((s) => s.result);
  const viewMode = useGame((s) => s.viewMode);
  const startGame = useGame((s) => s.startGame);
  const backToStart = useGame((s) => s.backToStart);
  if (!result) return null;

  const reason =
    result.reason === 'captured'
      ? '궁 잡힘'
      : result.reason === 'resign' && result.winner
        ? `${TEAM[other(result.winner)].name} 기권`
        : '양쪽 모두 한 수 쉼';
  const headline = result.winner ? `${TEAM[result.winner].name} 승리 · ${reason}` : `무승부 · ${reason}`;

  // viewer 가 null 이면 (차례마다 회전 모드) 둘이 같이 보는 카드
  const card = (viewer: Side | null, flip: boolean) => {
    const title = !result.winner ? '무승부' : !viewer ? `${TEAM[result.winner].name} 승리` : result.winner === viewer ? '승리' : '패배';
    const color = !result.winner ? '#f5e8d2' : viewer && result.winner !== viewer ? 'rgba(245,232,210,.6)' : '#f3d08a';
    return (
      <div key={viewer ?? 'all'} style={{ transform: flip ? 'rotate(180deg)' : undefined }}>
        <div className="panel panel-in pointer-events-auto min-w-[300px] px-8 py-5 text-center">
          <div className="text-[15px] tracking-wide text-[rgba(245,232,210,.6)]">{headline}</div>
          <div className="title mt-1 text-[52px] leading-tight" style={{ color, textShadow: '0 0 24px rgba(243,208,138,.35)' }}>
            {title}
          </div>
          <div className="mt-3 flex justify-center gap-2">
            <button className="btn btn-primary px-6 text-[17px]" onClick={startGame}>
              다시 두기
            </button>
            <button className="btn text-[16px]" onClick={backToStart}>
              처음 화면
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-[8vh] bg-black/30">
      {viewMode === 'face' ? [card('han', true), card('cho', false)] : card(null, false)}
    </div>
  );
}
