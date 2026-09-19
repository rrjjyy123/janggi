import * as THREE from 'three';
import type { Piece, PieceType, Side } from '../game/types';
import type { PieceStyle } from '../store/gameStore';
import { buildAnimal } from './animals';
import { HANGUL, HANJA, HANJA_FONT, UI_FONT } from './constants';
import { createHanjaPiece } from './hanjaPiece';
import { material } from './materials';

const BASE_R = 0.45;
const BASE_H = 0.08;
/** 캐릭터를 판 칸에 맞게 키우는 배율 */
export const FIGURE_SCALE = 1.22;

let baseGeo: THREE.BufferGeometry | null = null;
/** 모서리가 둥근 받침 원판 */
function plateGeometry() {
  if (baseGeo) return baseGeo;
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, 0)];
  const rr = 0.025;
  for (let i = 0; i <= 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2);
    pts.push(new THREE.Vector2(BASE_R - rr + Math.cos(a) * rr, rr + Math.sin(a) * rr));
  }
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    pts.push(new THREE.Vector2(BASE_R - rr + Math.cos(a) * rr, BASE_H - rr + Math.sin(a) * rr));
  }
  pts.push(new THREE.Vector2(0, BASE_H));
  baseGeo = new THREE.LatheGeometry(pts, 32);
  baseGeo.userData.shared = true;
  return baseGeo;
}

const labelCache = new Map<string, THREE.Material>();
/** 받침 앞쪽에 새긴 이름표: "車 차" */
function labelMaterial(type: PieceType, side: Side): THREE.Material {
  const key = type + side;
  let m = labelCache.get(key);
  if (m) return m;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 96;
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(20,12,8,0.78)';
  g.beginPath();
  g.roundRect(6, 10, 244, 76, 38);
  g.fill();
  g.strokeStyle = 'rgba(226,176,74,0.9)';
  g.lineWidth = 3;
  g.stroke();
  g.fillStyle = '#f3d08a';
  g.textBaseline = 'middle';
  g.textAlign = 'center';
  g.font = `900 56px ${HANJA_FONT}`;
  g.fillText(HANJA[type][side], 88, 51);
  g.font = `700 50px ${UI_FONT}`;
  g.fillText(HANGUL[type][side], 170, 50);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  m = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false });
  labelCache.set(key, m);
  return m;
}

const labelGeo = new THREE.PlaneGeometry(0.5, 0.19);
labelGeo.userData.shared = true;
const rimGeo = new THREE.TorusGeometry(BASE_R - 0.005, 0.012, 5, 40);
rimGeo.userData.shared = true;

export interface PieceView {
  root: THREE.Group; // 판 위 위치
  model: THREE.Group; // 들어올림·튕김·늘어남
  plate: THREE.Group; // 받침·이름표·한자알: 보는 사람(주인) 쪽으로 돌림
  figure: THREE.Group | null; // 캐릭터: 상대 진영을 바라봄
  style: PieceStyle;
  side: Side;
  type: PieceType;
}

/** 위에서 내려다볼 때 얼굴이 보이도록 캐릭터를 뒤로 젖히는 각도 */
export const LEAN = { face: 0.36, rotate: 0.06 };

/** 캐릭터가 바라보는 방향: 초는 한 쪽(-Z), 한은 초 쪽(+Z) */
export const figureFacing = (side: Side) => (side === 'cho' ? Math.PI : 0);

export function createPiece(p: Piece, style: PieceStyle, lean: number): PieceView {
  const root = new THREE.Group();
  root.userData.pieceId = p.id;
  const model = new THREE.Group();
  const plate = new THREE.Group();
  root.add(model);
  model.add(plate);
  let figure: THREE.Group | null = null;

  if (style === 'hanja') {
    plate.add(createHanjaPiece(p.type, p.side));
  } else {
    const base = new THREE.Mesh(plateGeometry(), material('teamLacquer', p.side));
    base.castShadow = true;
    base.receiveShadow = true;
    plate.add(base);
    const rim = new THREE.Mesh(rimGeo, material('gold', p.side));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = BASE_H;
    plate.add(rim);
    const label = new THREE.Mesh(labelGeo, labelMaterial(p.type, p.side));
    label.rotation.x = -Math.PI / 2;
    label.position.set(0, BASE_H + 0.004, 0.31);
    label.renderOrder = 2;
    plate.add(label);

    // 받침 위의 한 점을 축으로 캐릭터만 상대 쪽으로 돌린다
    const turn = new THREE.Group();
    turn.position.y = BASE_H;
    turn.rotation.y = figureFacing(p.side);
    figure = new THREE.Group();
    figure.add(buildAnimal(p.type, p.side));
    figure.scale.setScalar(FIGURE_SCALE);
    figure.rotation.x = -lean;
    turn.add(figure);
    model.add(turn);
  }
  return { root, model, plate, figure, style, side: p.side, type: p.type };
}

export function disposePiece(v: PieceView) {
  v.root.traverse((o) => {
    if (o instanceof THREE.Mesh && !o.geometry.userData.shared) o.geometry.dispose();
  });
}
