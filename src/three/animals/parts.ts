import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Side } from '../../game/types';
import { material, type MatName } from '../materials';

export type V3 = [number, number, number];

const SPHERE = new THREE.SphereGeometry(1, 18, 12);

/**
 * 캐릭터를 도형으로 조립하는 도구.
 * 부품은 전부 임시 Group 에 붙였다가 bake() 에서 같은 재질끼리 하나로 합친다.
 * within() 으로 기울어진 장비(대포·창 등)를 따로 좌표계를 잡아 만들 수 있다.
 */
export class Kit {
  readonly root = new THREE.Group();
  private stack: THREE.Object3D[] = [this.root];

  constructor(readonly side: Side) {}

  private get parent() {
    return this.stack[this.stack.length - 1];
  }

  mesh(geo: THREE.BufferGeometry, mat: MatName, pos: V3 = [0, 0, 0], rot?: V3, scale?: V3 | number) {
    const m = new THREE.Mesh(geo, material(mat, this.side));
    m.position.set(...pos);
    if (rot) m.rotation.set(...rot);
    if (scale !== undefined) typeof scale === 'number' ? m.scale.setScalar(scale) : m.scale.set(...scale);
    this.parent.add(m);
    return m;
  }

  /** 늘이거나 눌러서 쓰는 공 */
  ball(mat: MatName, pos: V3, scale: V3 | number, rot?: V3) {
    return this.mesh(SPHERE, mat, pos, rot, scale);
  }

  cyl(mat: MatName, pos: V3, rTop: number, rBot: number, h: number, rot?: V3, seg = 16) {
    return this.mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat, pos, rot);
  }

  cone(mat: MatName, pos: V3, r: number, h: number, rot?: V3, seg = 14) {
    return this.mesh(new THREE.ConeGeometry(r, h, seg), mat, pos, rot);
  }

  box(mat: MatName, pos: V3, size: V3, rot?: V3, radius = 0.015) {
    const r = Math.min(radius, size[0] / 2.01, size[1] / 2.01, size[2] / 2.01);
    return this.mesh(new RoundedBoxGeometry(size[0], size[1], size[2], 1, r), mat, pos, rot);
  }

  torus(mat: MatName, pos: V3, r: number, tube: number, rot?: V3, arc = Math.PI * 2) {
    return this.mesh(new THREE.TorusGeometry(r, tube, 6, 28, arc), mat, pos, rot);
  }

  /** (반지름, 높이) 옆모습을 돌려 만든 몸통·옷 */
  lathe(mat: MatName, pos: V3, profile: [number, number][], rot?: V3, scale?: V3) {
    const pts = profile.map(([r, y]) => new THREE.Vector2(r, y));
    return this.mesh(new THREE.LatheGeometry(pts, 24), mat, pos, rot, scale);
  }

  /** 점들을 부드럽게 잇는 관 (코끼리 코, 꼬리 등) */
  tube(mat: MatName, pts: V3[], r: number) {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    return this.mesh(new THREE.TubeGeometry(curve, 14, r, 8, false), mat);
  }

  /** 얇은 판 모양 (깃발·날개·방패판) */
  flat(mat: MatName, pos: V3, shape: [number, number][], depth: number, rot?: V3) {
    const s = new THREE.Shape(shape.map(([x, y]) => new THREE.Vector2(x, y)));
    const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
    geo.translate(0, 0, -depth / 2);
    return this.mesh(geo, mat, pos, rot);
  }

  /** 위치·회전을 잡은 하위 좌표계 안에서 부품 만들기 */
  within(pos: V3, rot: V3, fn: () => void) {
    const g = new THREE.Group();
    g.position.set(...pos);
    g.rotation.set(...rot);
    this.parent.add(g);
    this.stack.push(g);
    fn();
    this.stack.pop();
  }

  /** 반짝이는 눈 한 쌍 */
  eyes(dx: number, y: number, z: number, r = 0.042, tilt = 0) {
    for (const s of [-1, 1]) {
      this.ball('eye', [s * dx, y, z], [r, r * 1.15, r * 0.65], [0, s * tilt, 0]);
      this.ball('white', [s * dx + r * 0.32, y + r * 0.42, z + r * 0.5], r * 0.3);
    }
  }

  cheeks(dx: number, y: number, z: number) {
    for (const s of [-1, 1]) this.ball('pink', [s * dx, y, z], [0.045, 0.028, 0.02]);
  }

  /** 같은 재질끼리 합쳐 draw call 을 줄인 결과 */
  bake(): THREE.Group {
    this.root.updateMatrixWorld(true);
    const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>();
    this.root.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      let g = o.geometry.clone().applyMatrix4(o.matrixWorld);
      if (g.index) g = g.toNonIndexed();
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      g.clearGroups();
      const list = byMat.get(o.material) ?? [];
      list.push(g);
      byMat.set(o.material, list);
    });
    const out = new THREE.Group();
    for (const [mat, geos] of byMat) {
      const merged = mergeGeometries(geos, false)!;
      merged.userData.shared = true;
      geos.forEach((g) => g.dispose());
      const m = new THREE.Mesh(merged, mat);
      m.castShadow = true;
      m.receiveShadow = true;
      out.add(m);
    }
    return out;
  }
}
