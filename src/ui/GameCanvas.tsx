import { useEffect, useRef } from 'react';
import { at } from '../game/board';
import { useGame } from '../store/gameStore';
import { JanggiScene, type SceneSnapshot } from '../three/Scene';

type GameState = ReturnType<typeof useGame.getState>;

function snapshot(s: GameState): SceneSnapshot {
  let lastMove: SceneSnapshot['lastMove'] = null;
  for (let i = s.history.length - 1; i >= 0; i--) {
    const h = s.history[i];
    if (h.from && h.to) {
      lastMove = { from: h.from, to: h.to };
      break;
    }
  }
  return {
    board: s.board,
    turn: s.turn,
    selected: s.selected,
    targets: s.targets,
    lastMove,
    checkedSide: s.checkedSide,
    pieceStyle: s.pieceStyle,
    viewMode: s.viewMode,
    quality: s.quality,
    result: s.result,
    shake: s.shake,
  };
}

export function GameCanvas() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = new JanggiScene(ref.current!, {
      onTap: (p) => useGame.getState().tapPoint(p),
      onLongPress: (p) => {
        const s = useGame.getState();
        const piece = at(s.board, p);
        if (piece && s.screen === 'game') s.showRuleCard(piece);
      },
    });
    scene.sync(snapshot(useGame.getState()));
    // 첫 화면이 그려지면 로딩 가림막을 걷는다
    requestAnimationFrame(() => {
      const boot = document.getElementById('boot');
      if (!boot) return;
      boot.style.opacity = '0';
      setTimeout(() => boot.remove(), 500);
    });
    const unsub = useGame.subscribe((s) => scene.sync(snapshot(s)));
    return () => {
      unsub();
      scene.dispose();
    };
  }, []);

  return <div ref={ref} className="absolute inset-0" />;
}
