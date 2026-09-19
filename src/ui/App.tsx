import { useEffect, useState } from 'react';
import type { Side } from '../game/types';
import { sfx, unlockAudio } from '../audio/sfx';
import { useGame } from '../store/gameStore';
import { CheckBanner, ResultOverlay } from './CheckBanner';
import { GameCanvas } from './GameCanvas';
import { PlayerPanel } from './PlayerPanel';
import { RuleCard } from './RuleCard';
import { SettingsMenu } from './SettingsMenu';
import { StartScreen } from './StartScreen';

/** 상태 변화에 맞춰 효과음 */
function useSounds() {
  useEffect(() => {
    return useGame.subscribe((s, p) => {
      if (!s.sound) return;
      if (s.history.length > p.history.length) {
        const last = s.history[s.history.length - 1];
        if (last.captured) sfx.capture();
        else if (last.from) sfx.move();
      }
      if (s.announcement && s.announcement !== p.announcement) {
        if (s.announcement.kind === 'check') sfx.check();
        else if (s.announcement.kind === 'defended') sfx.defend();
      }
      if (s.result && !p.result) sfx.win();
      if (s.selected && s.selected !== p.selected) sfx.select();
      if (s.shake && s.shake !== p.shake) sfx.wrong();
    });
  }, []);
}

export function App() {
  const screen = useGame((s) => s.screen);
  const viewMode = useGame((s) => s.viewMode);
  const turn = useGame((s) => s.turn);
  const [menuFor, setMenuFor] = useState<Side | null>(null);
  useSounds();

  // 차례마다 회전 모드에서는 지금 차례인 사람이 화면 아래쪽
  const bottomSide: Side = viewMode === 'rotate' ? turn : 'cho';
  const topSide: Side = bottomSide === 'cho' ? 'han' : 'cho';

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#140c08]" onPointerDown={unlockAudio}>
      <GameCanvas />
      <div className="vignette" />
      {screen === 'game' && (
        <>
          <PlayerPanel side={topSide} bottom={false} onMenu={() => setMenuFor(topSide)} />
          <PlayerPanel side={bottomSide} bottom onMenu={() => setMenuFor(bottomSide)} />
          <CheckBanner />
          <ResultOverlay />
          <RuleCard />
        </>
      )}
      {screen === 'start' && <StartScreen />}
      {menuFor && <SettingsMenu side={menuFor} onClose={() => setMenuFor(null)} />}
    </div>
  );
}
