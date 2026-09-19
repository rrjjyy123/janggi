import { formationPieces, FORMATIONS } from '../game/setup';
import type { Side } from '../game/types';
import { useGame } from '../store/gameStore';
import { TEAM } from '../three/constants';
import { Flip, PieceChip, TeamSeal } from './common';
import { STYLE_OPTIONS, Toggle, VIEW_OPTIONS } from './SettingsMenu';

/** 한 쪽의 상차림(마·상 배치) 고르기. 자기 자리에서 본 왼→오 순서. */
function FormationPicker({ side }: { side: Side }) {
  const value = useGame((s) => s.formations[side]);
  const setFormation = useGame((s) => s.setFormation);
  const style = useGame((s) => s.pieceStyle);
  const t = TEAM[side];
  return (
    <Flip side={side} className="w-full max-w-[680px]">
      <div className="panel panel-in p-3">
        <div className="mb-2 flex items-center justify-center gap-2">
          <TeamSeal side={side} size={28} />
          <span className="title text-[18px]" style={{ color: t.light }}>
            {t.name} 상차림
          </span>
          <span className="text-[13px] text-[rgba(245,232,210,.5)]">{side === 'cho' ? '먼저 둡니다' : '나중에 둡니다'}</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {FORMATIONS.map((f) => {
            const [a, b, c, d] = formationPieces(f);
            const on = value === f;
            return (
              <button
                key={f}
                onClick={() => setFormation(side, f)}
                className="flex flex-col items-center gap-1 rounded-xl p-2 transition active:scale-95"
                style={{
                  background: on ? 'rgba(214,168,92,.22)' : 'rgba(0,0,0,.25)',
                  border: `1px solid ${on ? '#f3d08a' : 'rgba(214,168,92,.18)'}`,
                }}
              >
                <div className="flex items-center">
                  <PieceChip type={a} side={side} style={style} size={30} />
                  <PieceChip type={b} side={side} style={style} size={30} />
                  <span className="mx-1 text-[rgba(245,232,210,.3)]">·</span>
                  <PieceChip type={c} side={side} style={style} size={30} />
                  <PieceChip type={d} side={side} style={style} size={30} />
                </div>
                <div className={`text-[14px] ${on ? 'font-bold text-[#f3d08a]' : 'text-[rgba(245,232,210,.65)]'}`}>{f}</div>
              </button>
            );
          })}
        </div>
      </div>
    </Flip>
  );
}

export function StartScreen() {
  const s = useGame();
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-between gap-3 overflow-auto bg-[rgba(20,12,8,.55)] p-4 backdrop-blur-[3px]">
      <FormationPicker side="han" />

      <div className="panel panel-in w-full max-w-[500px] space-y-4 p-6 text-center">
        <div>
          <div className="title text-[52px] leading-none text-[#f3d08a]" style={{ textShadow: '0 0 30px rgba(243,208,138,.3)' }}>
            장기 3D
          </div>
          <div className="mt-2 text-[15px] text-[rgba(245,232,210,.65)]">
            태블릿 한 대를 가운데 두고 마주 앉아 두는 장기. 말을 길게 누르면 움직이는 법이 나옵니다.
          </div>
        </div>
        <Toggle value={s.pieceStyle} options={STYLE_OPTIONS} onChange={s.setPieceStyle} />
        <Toggle value={s.viewMode} options={VIEW_OPTIONS} onChange={s.setViewMode} />
        <button className="btn btn-primary w-full py-4 text-[22px]" onClick={s.startGame}>
          대국 시작
        </button>
      </div>

      <FormationPicker side="cho" />
    </div>
  );
}
