import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { HANJA_FONT, UI_FONT } from './three/constants';
import { App } from './ui/App';

/**
 * 3D 말의 글자는 캔버스에 한 번 그려 텍스처로 쓰므로, 글꼴이 준비된 뒤 시작한다.
 * 오프라인이면 기다리지 않고 시스템 글꼴로 그린다.
 */
async function waitFonts() {
  const load = Promise.all([
    document.fonts.load(`900 64px ${HANJA_FONT}`, '楚漢士車包馬象卒兵河界'),
    document.fonts.load(`700 50px ${UI_FONT}`, '궁사차포마상졸병'),
    document.fonts.load('700 20px "Gowun Batang"', '장기'),
  ]).catch(() => {});
  await Promise.race([load, new Promise((r) => setTimeout(r, 2500))]);
}

if (import.meta.env.DEV) void import('./store/gameStore').then((m) => ((window as unknown as { __game: unknown }).__game = m.useGame));

// 글꼴을 기다린 뒤, 로딩 문구가 한 번 그려지고 나서 무거운 텍스처 생성을 시작한다
void waitFonts().then(() => new Promise((r) => setTimeout(r, 30))).then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
