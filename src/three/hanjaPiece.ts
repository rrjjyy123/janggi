import * as THREE from 'three';
import type { PieceType, Side } from '../game/types';
import { HANJA, HANJA_FONT, TEAM } from './constants';
import { drawWood, WOODS } from './textures';

/** 궁이 가장 크고, 사·졸이 가장 작은 전통 장기알 크기 (꼭짓점까지 반지름) */
export const HANJA_RADIUS: Record<PieceType, number> = {
  K: 0.5,
  R: 0.44,
  C: 0.44,
  H: 0.44,
  E: 0.44,
  A: 0.37,
  P: 0.37,
};

const BEVEL = 0.035;
const S = 256;

let woodFace: { color: HTMLCanvasElement; bump: HTMLCanvasElement } | null = null;

/** 윗면: 원목 결 위에 팀 색으로 새긴 한자. 요철 맵에도 글자를 파서 음각 느낌을 낸다. */
function faceTextures(type: PieceType, side: Side, r: number) {
  woodFace ??= drawWood(WOODS.boxwood, S, S, 5);
  const color = document.createElement('canvas');
  const bump = document.createElement('canvas');
  color.width = color.height = bump.width = bump.height = S;
  const g = color.getContext('2d')!;
  const b = bump.getContext('2d')!;
  g.drawImage(woodFace.color, 0, 0);
  b.drawImage(woodFace.bump, 0, 0);

  const oct = (ctx: CanvasRenderingContext2D, rad: number) => {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      ctx.lineTo(S / 2 + Math.cos(a) * rad, S / 2 + Math.sin(a) * rad);
    }
    ctx.closePath();
  };
  const glyph = HANJA[type][side];
  const font = `900 ${type === 'K' ? 150 : 138}px ${HANJA_FONT}`;
  for (const ctx of [g, b]) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font;
  }
  // 안쪽 팔각 테두리 홈
  g.strokeStyle = 'rgba(70,40,15,0.45)';
  g.lineWidth = 4;
  oct(g, S * 0.43);
  g.stroke();
  b.strokeStyle = '#303030';
  b.lineWidth = 5;
  oct(b, S * 0.43);
  b.stroke();
  // 글자: 살짝 어두운 그림자 위에 팀 색 → 파인 글자에 물감을 채운 느낌
  g.fillStyle = 'rgba(50,25,5,0.5)';
  g.fillText(glyph, S / 2 + 2, S / 2 + 10);
  g.fillStyle = TEAM[side].text;
  g.fillText(glyph, S / 2, S / 2 + 8);
  b.fillStyle = '#202020';
  b.fillText(glyph, S / 2, S / 2 + 8);

  const map = new THREE.CanvasTexture(color);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const bumpMap = new THREE.CanvasTexture(bump);
  // 윗면 UV 는 모양 좌표(-r~r) 그대로라 0~1 로 맞춘다
  for (const t of [map, bumpMap]) {
    t.repeat.set(1 / (2 * r), 1 / (2 * r));
    t.offset.set(0.5, 0.5);
  }
  return { map, bumpMap };
}

let sideMat: THREE.Material | null = null;
const geoCache = new Map<PieceType, THREE.BufferGeometry>();
const faceCache = new Map<string, THREE.Material>();

function pieceGeometry(type: PieceType) {
  let geo = geoCache.get(type);
  if (geo) return geo;
  const r = HANJA_RADIUS[type] - BEVEL;
  const h = 0.2 + HANJA_RADIUS[type] * 0.2;
  const shape = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const p = new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r);
    if (i === 0) shape.moveTo(p.x, p.y);
    else shape.lineTo(p.x, p.y);
  }
  shape.closePath();
  geo = new THREE.ExtrudeGeometry(shape, {
    depth: h - BEVEL * 2,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL,
    bevelSegments: 4,
  });
  // 모양의 +y 가 -Z(글자 위쪽), 두께 방향이 +Y 가 되도록 눕힘 → 초 쪽에서 똑바로 읽힘
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, BEVEL, 0);
  geo.userData.shared = true;
  geo.userData.height = h;
  geoCache.set(type, geo);
  return geo;
}

/** 모서리가 둥근 팔각 원목 장기알 */
export function createHanjaPiece(type: PieceType, side: Side): THREE.Object3D {
  const geo = pieceGeometry(type);
  if (!sideMat) {
    const w = drawWood(WOODS.boxwood, 256, 256, 9);
    const map = new THREE.CanvasTexture(w.color);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(1.5, 1.5);
    sideMat = new THREE.MeshPhysicalMaterial({ map, roughness: 0.45, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  }
  const key = type + side;
  let face = faceCache.get(key);
  if (!face) {
    face = new THREE.MeshPhysicalMaterial({
      ...faceTextures(type, side, HANJA_RADIUS[type] - BEVEL),
      bumpScale: 1.2,
      roughness: 0.42,
      clearcoat: 0.8,
      clearcoatRoughness: 0.18,
    });
    faceCache.set(key, face);
  }
  // ExtrudeGeometry 재질 순서: 0 = 윗면·밑면, 1 = 옆면·모서리
  const mesh = new THREE.Mesh(geo, [face, sideMat]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const g = new THREE.Group();
  g.add(mesh);
  g.userData.height = geo.userData.height;
  return g;
}
