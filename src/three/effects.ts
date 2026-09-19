import * as THREE from 'three';
import type { Pos, Side } from '../game/types';
import { TEAM, toWorld } from './constants';
import { radialTexture } from './textures';

export interface MarkerInput {
  selected: Pos | null;
  selectedSide: Side | null;
  targets: Pos[];
  captureTargets: Pos[];
  lastMove: { from: Pos; to: Pos } | null;
  checkedKing: Pos | null;
}

interface Marker {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  base: number; // 목표 불투명도
  pulse: number; // 깜빡임 세기
  scale: number;
}

interface Burst {
  points: THREE.Points;
  vel: Float32Array;
  age: number;
  life: number;
  gravity: number;
}

const plane = new THREE.PlaneGeometry(1, 1);

/** 이동 가능 칸 등의 발광 표시와 먼지·반짝이·색종이 */
export class Effects {
  private markers: Marker[] = [];
  private markerRoot = new THREE.Group();
  private bursts: Burst[] = [];
  private glowTex = radialTexture();
  private ringTex = radialTexture(true);
  private markerAge = 0;
  private confetti: { mesh: THREE.InstancedMesh; data: Float32Array; age: number } | null = null;

  constructor(private scene: THREE.Scene) {
    scene.add(this.markerRoot);
  }

  private addMarker(tex: THREE.Texture, color: THREE.ColorRepresentation, p: Pos, size: number, opacity: number, pulse = 0, y = 0.012) {
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      color,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(plane, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(toWorld(p, y));
    mesh.scale.setScalar(size);
    mesh.renderOrder = 3;
    this.markerRoot.add(mesh);
    this.markers.push({ mesh, mat, base: opacity, pulse, scale: size });
  }

  setMarkers(s: MarkerInput) {
    for (const m of this.markers) m.mat.dispose();
    this.markers = [];
    this.markerRoot.clear();
    this.markerAge = 0;

    if (s.lastMove) {
      this.addMarker(this.ringTex, '#ffb050', s.lastMove.from, 0.95, 0.28);
      this.addMarker(this.ringTex, '#ffb050', s.lastMove.to, 0.95, 0.35);
    }
    if (s.checkedKing) this.addMarker(this.ringTex, '#ff2a1a', s.checkedKing, 1.7, 0.95, 0.35, 0.02);
    if (s.selected && s.selectedSide) {
      const c = new THREE.Color(TEAM[s.selectedSide].light).lerp(new THREE.Color('#ffe2a0'), 0.5);
      this.addMarker(this.ringTex, c, s.selected, 1.45, 0.95, 0.15, 0.016);
    }
    for (const t of s.targets) {
      const capture = s.captureTargets.some((c) => c.x === t.x && c.y === t.y);
      if (capture) this.addMarker(this.ringTex, '#ff5040', t, 1.4, 0.95, 0.25, 0.018);
      else {
        this.addMarker(this.glowTex, '#57f59a', t, 0.85, 0.55, 0.2);
        this.addMarker(this.glowTex, '#e8fff0', t, 0.26, 0.9, 0, 0.014);
      }
    }
  }

  /** 움직이는 표시·파티클이 있어서 계속 다시 그려야 하는지 */
  get busy() {
    return this.markerAge < 0.3 || this.markers.some((m) => m.pulse > 0) || this.bursts.length > 0 || !!this.confetti;
  }

  /** 착지 먼지 */
  dust(at: THREE.Vector3, color = '#e8d2b0', count = 22) {
    this.burst(at, color, count, 1.6, 0.9, 0.6, 0.14, 2.5);
  }

  /** 잡힌 말이 튕겨 나갈 때 반짝이 */
  sparkle(at: THREE.Vector3, color = '#ffd27a') {
    this.burst(at, color, 34, 3.2, 1.2, 0.9, 0.12, 4);
  }

  private burst(at: THREE.Vector3, color: string, n: number, speed: number, up: number, life: number, size: number, gravity: number) {
    const pos = new Float32Array(n * 3);
    const vel = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.4 + Math.random() * 0.6);
      pos[i * 3] = at.x + Math.cos(a) * 0.2;
      pos[i * 3 + 1] = at.y + 0.05;
      pos[i * 3 + 2] = at.z + Math.sin(a) * 0.2;
      vel[i * 3] = Math.cos(a) * sp;
      vel[i * 3 + 1] = up * (0.3 + Math.random());
      vel[i * 3 + 2] = Math.sin(a) * sp;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      map: this.glowTex,
      color,
      size,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geo, mat);
    points.renderOrder = 4;
    this.scene.add(points);
    this.bursts.push({ points, vel, age: 0, life, gravity });
  }

  /** 승리 색종이 */
  celebrate(colors: string[]) {
    this.clearConfetti();
    const N = 360;
    const geo = new THREE.PlaneGeometry(0.09, 0.14);
    const mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.5, metalness: 0.2 });
    const mesh = new THREE.InstancedMesh(geo, mat, N);
    // 위치 xyz, 속도 xyz, 회전 xyz, 회전속도 xyz
    const data = new Float32Array(N * 12);
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const o = i * 12;
      data[o] = (Math.random() - 0.5) * 9;
      data[o + 1] = 6 + Math.random() * 5;
      data[o + 2] = (Math.random() - 0.5) * 10;
      data[o + 3] = (Math.random() - 0.5) * 0.6;
      data[o + 4] = -1 - Math.random();
      data[o + 5] = (Math.random() - 0.5) * 0.6;
      for (let k = 6; k < 9; k++) data[o + k] = Math.random() * 6;
      for (let k = 9; k < 12; k++) data[o + k] = (Math.random() - 0.5) * 10;
      mesh.setColorAt(i, c.set(colors[i % colors.length]));
    }
    mesh.frustumCulled = false;
    this.scene.add(mesh);
    this.confetti = { mesh, data, age: 0 };
  }

  clearConfetti() {
    if (!this.confetti) return;
    this.scene.remove(this.confetti.mesh);
    this.confetti.mesh.geometry.dispose();
    (this.confetti.mesh.material as THREE.Material).dispose();
    this.confetti = null;
  }

  update(dt: number, t: number) {
    this.markerAge += dt;
    const fade = Math.min(1, this.markerAge / 0.25);
    for (const m of this.markers) {
      const wave = Math.sin(t * 4);
      m.mat.opacity = m.base * fade * (1 - m.pulse * 0.5 + m.pulse * 0.5 * wave);
      m.mesh.scale.setScalar(m.scale * (1 + m.pulse * 0.08 * wave));
    }

    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.age += dt;
      const attr = b.points.geometry.getAttribute('position') as THREE.BufferAttribute;
      const p = attr.array as Float32Array;
      const drag = Math.exp(-3.5 * dt);
      for (let j = 0; j < p.length; j += 3) {
        b.vel[j] *= drag;
        b.vel[j + 2] *= drag;
        b.vel[j + 1] = b.vel[j + 1] * drag - b.gravity * dt;
        p[j] += b.vel[j] * dt;
        p[j + 1] = Math.max(0.01, p[j + 1] + b.vel[j + 1] * dt);
        p[j + 2] += b.vel[j + 2] * dt;
      }
      attr.needsUpdate = true;
      (b.points.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - b.age / b.life);
      if (b.age >= b.life) {
        this.scene.remove(b.points);
        b.points.geometry.dispose();
        (b.points.material as THREE.Material).dispose();
        this.bursts.splice(i, 1);
      }
    }

    if (this.confetti) {
      const { mesh, data } = this.confetti;
      this.confetti.age += dt;
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const e = new THREE.Euler();
      const pos = new THREE.Vector3();
      const shrink = Math.max(0, Math.min(1, (5 - this.confetti.age) / 1.5));
      const sc = new THREE.Vector3(shrink, shrink, shrink);
      for (let i = 0; i < mesh.count; i++) {
        const o = i * 12;
        data[o + 4] = Math.max(-1.6, data[o + 4] - 2.5 * dt);
        for (let k = 0; k < 3; k++) data[o + k] += data[o + 3 + k] * dt;
        if (data[o + 1] < 0.02) {
          data[o + 1] = 0.02;
          data[o + 3] = data[o + 4] = data[o + 5] = 0;
        } else for (let k = 6; k < 9; k++) data[o + k] += data[o + 3 + k] * dt;
        pos.set(data[o], data[o + 1], data[o + 2]);
        q.setFromEuler(e.set(data[o + 6], data[o + 7], data[o + 8]));
        mesh.setMatrixAt(i, m.compose(pos, q, sc));
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (this.confetti.age > 5) this.clearConfetti();
    }
  }
}
