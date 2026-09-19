import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { PieceType, Side } from '../game/types';
import type { PieceStyle } from '../store/gameStore';
import { createPiece } from './pieceFactory';

/**
 * 패널·규칙 카드에 쓰는 말 초상화. 작은 별도 렌더러로 한 번씩 찍어 이미지 주소로 보관한다.
 * (메인 렌더러의 render target 에 찍으면 톤매핑이 빠져 색이 달라져서 따로 둔다)
 */
const SIZE = 192;
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
const cache = new Map<string, string>();

function setup() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(SIZE, SIZE);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight('#ffe2c0', '#2a1a10', 0.7));
  const key = new THREE.DirectionalLight('#ffd8a8', 2.6);
  key.position.set(2, 4, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight('#9fb8ff', 0.8);
  rim.position.set(-3, 2, -3);
  scene.add(rim);
  camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
}

export function pieceThumbnail(type: PieceType, side: Side, style: PieceStyle): string {
  const key = type + side + style;
  const hit = cache.get(key);
  if (hit) return hit;
  if (!renderer) setup();
  const v = createPiece({ id: 'thumb', type, side }, style, 0);
  if (v.figure) {
    // 캐릭터가 카메라 쪽(+Z)을 보도록 되돌리고 살짝 비스듬히
    v.figure.parent!.rotation.y = -0.45;
    v.plate.rotation.y = 0;
    camera!.position.set(0, 1.25, 3.1);
    camera!.lookAt(0, 0.62, 0);
  } else {
    // 한자알은 비스듬히 위에서
    camera!.position.set(0, 2.1, 1.35);
    camera!.lookAt(0, 0.05, 0);
  }
  scene!.add(v.root);
  renderer!.render(scene!, camera!);
  const url = renderer!.domElement.toDataURL('image/png');
  scene!.remove(v.root);
  cache.set(key, url);
  return url;
}
