import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { HANJA_FONT } from './constants';
import { colorTex, dataTex, drawWood, woodTextures, WOODS } from './textures';

/** 상판 크기 (교차점 간격 1, 선 바깥 여백 약 1) */
const TOP_W = 9.9;
const TOP_D = 10.9;
const FRAME_W = 10.7;
const FRAME_D = 11.7;
const FRAME_H = 0.5;
export const FRAME_HALF = { x: FRAME_W / 2, z: FRAME_D / 2 };
const PX = 90;

/** 메이플 상판 + 먹으로 새긴 선·궁성·강 글씨 (요철 맵에도 홈을 판다) */
function boardTop() {
  const W = Math.round(TOP_W * PX);
  const H = Math.round(TOP_D * PX);
  // 판 전체에 곧게 흐르는 결 (나이테를 촘촘히, 휘어짐은 약하게)
  const { color, bump } = drawWood({ ...WOODS.maple, rings: 28 }, W, H, 3, 2, 0.9);
  const g = color.getContext('2d')!;
  const b = bump.getContext('2d')!;
  // 교차점 (x, y) → 캔버스. 캔버스 위쪽 = 한(-Z) 쪽.
  const cx = (x: number) => (x - 4 + TOP_W / 2) * PX;
  const cy = (y: number) => (TOP_D / 2 - 4.5 + y) * PX;
  const cyFlip = (y: number) => H - cy(y);

  const draw = (ctx: CanvasRenderingContext2D, ink: string, scale: number) => {
    ctx.strokeStyle = ink;
    ctx.fillStyle = ink;
    ctx.lineCap = 'round';
    const line = (x0: number, y0: number, x1: number, y1: number, w: number) => {
      ctx.lineWidth = w * scale;
      ctx.beginPath();
      ctx.moveTo(cx(x0), cyFlip(y0));
      ctx.lineTo(cx(x1), cyFlip(y1));
      ctx.stroke();
    };
    for (let x = 0; x < 9; x++) line(x, 0, x, 9, 3);
    for (let y = 0; y < 10; y++) line(0, y, 8, y, 3);
    ctx.lineWidth = 7 * scale;
    ctx.strokeRect(cx(0) - 7, cyFlip(9) - 7, 8 * PX + 14, 9 * PX + 14);
    for (const [y0, y1] of [
      [0, 2],
      [7, 9],
    ]) {
      line(3, y0, 5, y1, 3);
      line(5, y0, 3, y1, 3);
    }
    // 포·졸 자리 꺾쇠
    const mark = (x: number, y: number) => {
      const s = 9,
        l = 16;
      ctx.lineWidth = 2.5 * scale;
      for (const dx of [-1, 1]) {
        if (x + dx < 0 || x + dx > 8) continue;
        for (const dy of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(cx(x) + dx * s, cyFlip(y) + dy * (s + l));
          ctx.lineTo(cx(x) + dx * s, cyFlip(y) + dy * s);
          ctx.lineTo(cx(x) + dx * (s + l), cyFlip(y) + dy * s);
          ctx.stroke();
        }
      }
    };
    for (const y of [3, 6]) for (const x of [0, 2, 4, 6, 8]) mark(x, y);
    for (const y of [2, 7]) for (const x of [1, 7]) mark(x, y);
    // 강 글씨: 양쪽에서 하나씩 바로 읽히게
    ctx.font = `900 ${Math.round(PX * 0.62)}px ${HANJA_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const midY = (cyFlip(4) + cyFlip(5)) / 2;
    ctx.fillText('楚 河', cx(2), midY);
    ctx.save();
    ctx.translate(cx(6), midY);
    ctx.rotate(Math.PI);
    ctx.fillText('漢 界', 0, 0);
    ctx.restore();
  };
  g.globalAlpha = 0.82;
  draw(g, '#3a2210', 1);
  g.globalAlpha = 1;
  draw(b, '#1a1a1a', 1.2);

  const map = colorTex(color, false);
  const bumpMap = dataTex(bump, false);
  return new THREE.MeshStandardMaterial({ map, bumpMap, bumpScale: 0.9, roughness: 0.42 });
}

/** 판 아래로 번지는 부드러운 그늘 */
function softShadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 20, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0,0,0,0.75)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.5)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export function createBoard(): THREE.Group {
  const group = new THREE.Group();

  // 호두나무 틀
  const walnut = woodTextures('walnut', 1024, 2);
  const frameMat = new THREE.MeshStandardMaterial({ ...walnut, bumpScale: 0.5, roughness: 0.36 });
  const frame = new THREE.Mesh(new RoundedBoxGeometry(FRAME_W, FRAME_H, FRAME_D, 6, 0.22), frameMat);
  frame.position.y = -FRAME_H / 2 - 0.03;
  frame.castShadow = true;
  frame.receiveShadow = true;
  group.add(frame);

  // 메이플 상판
  const side = new THREE.MeshStandardMaterial({ color: '#8a5a30', roughness: 0.6 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(TOP_W, 0.08, TOP_D), [side, side, boardTop(), side, side, side]);
  top.position.y = -0.04;
  top.receiveShadow = true;
  group.add(top);

  // 황동 테두리
  const brass = new THREE.MeshStandardMaterial({ color: '#c9953f', metalness: 1, roughness: 0.28 });
  const t = 0.07;
  for (const [w, d, x, z] of [
    [TOP_W + t * 2, t, 0, TOP_D / 2 + t / 2],
    [TOP_W + t * 2, t, 0, -TOP_D / 2 - t / 2],
    [t, TOP_D, TOP_W / 2 + t / 2, 0],
    [t, TOP_D, -TOP_W / 2 - t / 2, 0],
  ]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, d), brass);
    m.position.set(x, -0.03, z);
    m.receiveShadow = true;
    group.add(m);
  }

  // 안개 속으로 사라지는 둥근 탁자. 넓은 면이라 조명 계산 없이 나뭇결 + 판 아래 그늘을 구워 넣는다.
  const tw = woodTextures('table', 1024);
  const tmap = tw.map.clone();
  tmap.repeat.set(5, 5);
  tmap.needsUpdate = true;
  const table = new THREE.Mesh(
    new THREE.CircleGeometry(60, 48),
    new THREE.MeshBasicMaterial({ map: tmap, color: '#d8b8a4' }),
  );
  table.rotation.x = -Math.PI / 2;
  table.position.y = -FRAME_H - 0.03;
  group.add(table);
  const shade = new THREE.Mesh(
    new THREE.PlaneGeometry(FRAME_W * 1.9, FRAME_D * 1.9),
    new THREE.MeshBasicMaterial({ map: softShadowTexture(), transparent: true, depthWrite: false, color: '#000' }),
  );
  shade.rotation.x = -Math.PI / 2;
  shade.position.y = -FRAME_H - 0.02;
  group.add(shade);
  return group;
}
