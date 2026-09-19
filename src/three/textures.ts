import * as THREE from 'three';

/** 시드로 재현되는, 타일링되는 value noise */
function makeNoise(seed: number) {
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256).map((_, i) => i);
  let s = seed * 9301 + 49297;
  const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const vals = new Float32Array(256).map(() => rand());
  const fade = (t: number) => t * t * (3 - 2 * t);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  return (x: number, y: number, px = 256, py = 256) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = fade(x - xi);
    const yf = fade(y - yi);
    const h = (a: number, b: number) => vals[perm[((((a % px) + px) % px) & 255) + perm[(((b % py) + py) % py) & 255]]];
    return lerp(lerp(h(xi, yi), h(xi + 1, yi), xf), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), xf), yf);
  };
}

export interface WoodSpec {
  light: [number, number, number];
  dark: [number, number, number];
  rings: number;
  streak: number;
}

export const WOODS = {
  walnut: { light: [112, 70, 42], dark: [58, 33, 18], rings: 14, streak: 0.4 },
  maple: { light: [222, 180, 124], dark: [168, 118, 68], rings: 9, streak: 0.3 },
  boxwood: { light: [246, 226, 188], dark: [214, 180, 130], rings: 7, streak: 0.22 },
  cherry: { light: [190, 104, 62], dark: [118, 52, 26], rings: 11, streak: 0.35 },
  table: { light: [74, 44, 28], dark: [34, 19, 11], rings: 22, streak: 0.45 },
} satisfies Record<string, WoodSpec>;

export interface WoodCanvases {
  color: HTMLCanvasElement;
  bump: HTMLCanvasElement;
}

/**
 * 나이테·옹이·잔결이 있는 나뭇결을 캔버스에 그린다 (색 + 요철).
 * 결은 가로(u) 방향으로 길게 흐른다.
 */
export function drawWood(spec: WoodSpec, w: number, h: number, seed = 1, knots = 0, warpAmt = 2.2): WoodCanvases {
  const noise = makeNoise(seed);
  const color = document.createElement('canvas');
  const bump = document.createElement('canvas');
  color.width = bump.width = w;
  color.height = bump.height = h;
  const ctx = color.getContext('2d')!;
  const bctx = bump.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  const bimg = bctx.createImageData(w, h);
  const { light, dark, rings, streak } = spec;

  const rnd = makeNoise(seed + 7);
  const knotList: [number, number, number][] = [];
  for (let k = 0; k < knots; k++) knotList.push([rnd(k * 3.1, 0.5) * w, rnd(0.5, k * 5.7) * h, 10 + rnd(k, k) * 18]);

  for (let j = 0; j < h; j++) {
    const v = j / h;
    for (let i = 0; i < w; i++) {
      const u = i / w;
      let warp = noise(u * 4, v * 6, 4, 6) * 0.9 + noise(u * 8, v * 12, 8, 12) * 0.4 + noise(u * 16, v * 24, 16, 24) * 0.15;
      for (const [kx, ky, kr] of knotList) {
        const dx = i - kx;
        const dy = (j - ky) * 2.2;
        warp += ((kr * kr * 1.5) / (dx * dx + dy * dy + kr * kr)) * 0.8;
      }
      const d = v * rings + warp * warpAmt;
      const ring = d - Math.floor(d);
      const ringT = Math.pow(Math.abs(Math.sin(ring * Math.PI)), 6);
      const fine = noise(u * 3, v * 180, 3, 180);
      const t = Math.min(1, ringT * 0.55 + fine * streak + noise(u * 40, v * 40, 40, 40) * 0.08);
      const o = (i + j * w) * 4;
      img.data[o] = light[0] + (dark[0] - light[0]) * t;
      img.data[o + 1] = light[1] + (dark[1] - light[1]) * t;
      img.data[o + 2] = light[2] + (dark[2] - light[2]) * t;
      img.data[o + 3] = 255;
      const b = 255 - t * 110;
      bimg.data[o] = bimg.data[o + 1] = bimg.data[o + 2] = b;
      bimg.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  bctx.putImageData(bimg, 0, 0);
  return { color, bump };
}

export function colorTex(c: HTMLCanvasElement, repeat = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function dataTex(c: HTMLCanvasElement, repeat = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const woodCache = new Map<string, { map: THREE.Texture; bumpMap: THREE.Texture }>();

/** 여러 곳에서 같이 쓰는 나무 재질 텍스처 (한 번만 생성) */
export function woodTextures(kind: keyof typeof WOODS, size = 512, knots = 0) {
  const key = `${kind}${size}${knots}`;
  let hit = woodCache.get(key);
  if (!hit) {
    const { color, bump } = drawWood(WOODS[kind], size, size, kind.length * 13 + size, knots);
    hit = { map: colorTex(color), bumpMap: dataTex(bump) };
    woodCache.set(key, hit);
  }
  return hit;
}

/** 가운데가 밝고 바깥으로 사라지는 원 (발광·파티클용) */
export function radialTexture(ring = false): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, ring ? 30 : 0, 64, 64, 62);
  if (ring) {
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.35, 'rgba(255,255,255,1)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.35)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
  } else {
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
