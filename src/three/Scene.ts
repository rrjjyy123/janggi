import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { at, onBoard, posOf, samePos } from '../game/board';
import type { Board, Pos, Side } from '../game/types';
import { computeLayout } from '../layout';
import type { GameResult, PieceStyle, Quality, ViewMode } from '../store/gameStore';
import { createBoard, FRAME_HALF } from './boardMesh';
import { fromWorld, TEAM, toWorld } from './constants';
import { Effects } from './effects';
import { createPiece, disposePiece, LEAN, type PieceView } from './pieceFactory';
import { ease, Tweens } from './tween';

export interface SceneSnapshot {
  board: Board;
  turn: Side;
  selected: Pos | null;
  targets: Pos[];
  lastMove: { from: Pos; to: Pos } | null;
  checkedSide: Side | null;
  pieceStyle: PieceStyle;
  viewMode: ViewMode;
  quality: Quality;
  result: GameResult | null;
  shake: { id: string; key: number } | null;
}

export interface SceneHandlers {
  onTap: (p: Pos | null) => void;
  onLongPress: (p: Pos) => void;
}

/** 판 위에서 잰 카메라 높이각: 마주 앉기는 바로 위, 차례마다 돌리기는 비스듬히 */
const ELEVATION: Record<ViewMode, number> = { face: Math.PI / 2 - 0.002, rotate: Math.PI / 2 - 0.78 };
const LONG_PRESS_MS = 480;
/** 두 손가락으로 돌려 본 뒤 원래 시점으로 돌아가기까지 */
const RETURN_DELAY = 1.5;

const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export class JanggiScene {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(38, 1, 0.5, 200);
  private controls: OrbitControls;
  private key: THREE.DirectionalLight;
  private glow: THREE.PointLight;
  private effects: Effects;
  private pieceRoot = new THREE.Group();
  private views = new Map<string, PieceView>();
  private posById = new Map<string, Pos>();
  private moving = new Set<string>();
  private tweens = new Tweens();
  private snap: SceneSnapshot | null = null;
  private resizeObs: ResizeObserver;
  private lastTime = performance.now();
  private time = 0;

  // 카메라: 방위각·높이각·거리
  private cam = { az: 0, el: ELEVATION.face, dist: 20 };
  private homeDist = 20;
  private userOrbit: 'idle' | 'active' | 'settling' = 'idle';
  private settleLeft = 0;
  private shakeAmp = 0;
  private glowPulse = 0;
  /** 가만히 있는 판은 다시 그리지 않는다 (태블릿 배터리·발열) */
  private dirty = true;

  private raycaster = new THREE.Raycaster();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private pointers = new Set<number>();
  private press: { id: number; x: number; y: number; timer: number; fired: boolean } | null = null;

  constructor(
    private container: HTMLElement,
    private handlers: SceneHandlers,
  ) {
    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.92;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.domElement.style.touchAction = 'none';
    r.domElement.style.display = 'block';
    container.appendChild(r.domElement);

    const bg = new THREE.Color('#140c08');
    this.scene.background = bg;
    this.scene.fog = new THREE.FogExp2(bg, 0.018);
    const pmrem = new THREE.PMREMGenerator(r);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.35;
    pmrem.dispose();

    this.scene.add(new THREE.HemisphereLight('#ffe2c0', '#2a1a10', 0.55));
    const key = (this.key = new THREE.DirectionalLight('#ffd8a8', 2.4));
    key.position.set(7, 18, 10);
    key.castShadow = true;
    const sc = key.shadow.camera;
    sc.left = sc.bottom = -8.5;
    sc.right = sc.top = 8.5;
    sc.near = 5;
    sc.far = 45;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 4;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight('#9fb8ff', 0.55);
    rim.position.set(-12, 8, -12);
    this.scene.add(rim);
    this.glow = new THREE.PointLight('#ffa860', 10, 30, 1.6);
    this.glow.position.set(0, 8, 0);
    this.scene.add(this.glow);

    this.scene.add(createBoard(), this.pieceRoot);
    this.effects = new Effects(this.scene);

    // 두 손가락(마우스는 오른쪽 버튼)으로만 돌려 보기. 한 손가락은 말 고르기.
    const c = (this.controls = new OrbitControls(this.camera, r.domElement));
    c.enablePan = false;
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.maxPolarAngle = 1.25;
    c.touches = { ONE: null as unknown as THREE.TOUCH, TWO: THREE.TOUCH.DOLLY_ROTATE };
    c.mouseButtons = { LEFT: null as unknown as THREE.MOUSE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    c.addEventListener('start', () => {
      this.userOrbit = 'active';
      this.cancelPress();
    });
    c.addEventListener('end', () => {
      this.userOrbit = 'settling';
      this.settleLeft = RETURN_DELAY;
    });

    const el = r.domElement;
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('pointercancel', this.onPointerUp);
    el.addEventListener('contextmenu', (e) => e.preventDefault());

    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(container);
    this.resize();
    r.setAnimationLoop(this.frame);
    // 개발 중 점검용: 탭이 가려져 렌더 루프가 멈췄을 때 수동으로 한 프레임 그리기
    if (import.meta.env.DEV) (window as unknown as { __scene: unknown }).__scene = this;
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    this.resizeObs.disconnect();
    this.controls.dispose();
    this.cancelPress();
    for (const v of this.views.values()) disposePiece(v);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  // ───────── 상태 반영 ─────────

  sync(s: SceneSnapshot) {
    const prev = this.snap;
    this.snap = s;
    this.dirty = true;

    if (!prev || prev.quality !== s.quality) this.applyQuality(s.quality);
    if (!prev || prev.pieceStyle !== s.pieceStyle) this.rebuildAllPieces(s, !prev);
    else if (prev.board !== s.board) this.diffBoard(s.board);

    if (s.shake && s.shake !== prev?.shake) this.shakePiece(s.shake.id);
    if (!prev || prev.viewMode !== s.viewMode) this.fit();
    if (prev && s.checkedSide && s.checkedSide !== prev.checkedSide) this.shakeAmp = Math.max(this.shakeAmp, 0.12);
    if (s.result && !prev?.result) this.celebrate(s.result);
    if (!s.result && prev?.result) this.effects.clearConfetti();

    let checkedKing: Pos | null = null;
    if (s.checkedSide) {
      const i = s.board.findIndex((p) => p?.type === 'K' && p.side === s.checkedSide);
      if (i >= 0) checkedKing = posOf(i);
    }
    this.effects.setMarkers({
      selected: s.selected,
      selectedSide: s.selected ? (at(s.board, s.selected)?.side ?? null) : null,
      targets: s.targets,
      captureTargets: s.targets.filter((t) => at(s.board, t)),
      lastMove: s.lastMove,
      checkedKing,
    });
  }

  private applyQuality(q: Quality) {
    this.renderer.setPixelRatio(q === 'high' ? Math.min(window.devicePixelRatio, 2) : 1);
    const size = q === 'high' ? 2048 : 1024;
    this.key.shadow.mapSize.set(size, size);
    this.key.shadow.map?.dispose();
    this.key.shadow.map = null;
    this.resize();
  }

  private rebuildAllPieces(s: SceneSnapshot, popIn: boolean) {
    for (const v of this.views.values()) {
      this.pieceRoot.remove(v.root);
      disposePiece(v);
    }
    this.views.clear();
    this.posById.clear();
    let n = 0;
    s.board.forEach((p, i) => {
      if (!p) return;
      const v = this.addPiece(p.id, posOf(i));
      if (popIn) this.popIn(v, n++ * 0.018);
    });
  }

  private addPiece(id: string, pos: Pos): PieceView {
    const s = this.snap!;
    const piece = at(s.board, pos)!;
    const v = createPiece(piece, s.pieceStyle, LEAN[s.viewMode]);
    v.root.position.copy(toWorld(pos));
    v.plate.rotation.y = this.plateFacing(piece.side);
    this.pieceRoot.add(v.root);
    this.views.set(id, v);
    this.posById.set(id, pos);
    return v;
  }

  private popIn(v: PieceView, delay: number) {
    v.root.scale.setScalar(0.001);
    void this.tweens.run({
      duration: 0.45,
      delay,
      easing: ease.outBack,
      update: (e) => v.root.scale.setScalar(Math.max(0.001, e)),
    });
  }

  /** 이전 판과 비교해서 움직인 말은 폴짝 뛰어가고, 잡힌 말은 튕겨 나간다 */
  private diffBoard(board: Board) {
    const now = new Map<string, Pos>();
    board.forEach((p, i) => p && now.set(p.id, posOf(i)));

    let arrive = 0;
    let landing: THREE.Vector3 | null = null;
    for (const [id, pos] of now) {
      const old = this.posById.get(id);
      const v = this.views.get(id);
      if (!v || !old) {
        this.popIn(this.addPiece(id, pos), 0);
        continue;
      }
      if (samePos(old, pos)) continue;
      this.posById.set(id, pos);
      const dur = v.type === 'C' ? 0.6 : v.type === 'H' || v.type === 'E' ? 0.52 : 0.44;
      arrive = Math.max(arrive, dur);
      landing = toWorld(pos);
      void this.animateMove(id, v, toWorld(old), toWorld(pos), dur);
    }

    for (const [id, v] of [...this.views]) {
      if (now.has(id)) continue;
      this.views.delete(id);
      this.posById.delete(id);
      void this.animateCapture(v, arrive * 0.85, landing);
    }
  }

  private async animateMove(id: string, v: PieceView, a: THREE.Vector3, b: THREE.Vector3, dur: number) {
    const jump = v.type === 'C' ? 1.5 : v.type === 'H' || v.type === 'E' ? 0.95 : 0.55;
    this.moving.add(id);
    await this.tweens.run({
      duration: dur,
      easing: ease.inOut,
      update: (e, k) => {
        v.root.position.lerpVectors(a, b, e);
        v.root.position.y = Math.sin(Math.PI * k) * jump;
        // 날아가는 동안 부피를 지키며 늘어남
        const s = 1 + 0.22 * Math.sin(Math.PI * k);
        v.model.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
      },
    });
    this.moving.delete(id);
    v.model.scale.set(1, 1, 1);
    this.effects.dust(b);
    await this.tweens.run({
      duration: 0.22,
      easing: ease.linear,
      update: (_, k) => {
        const s = Math.sin(Math.PI * k) * 0.16;
        v.model.scale.set(1 + s * 0.6, 1 - s, 1 + s * 0.6);
      },
    });
    v.model.scale.set(1, 1, 1);
  }

  private async animateCapture(v: PieceView, delay: number, from: THREE.Vector3 | null) {
    const start = v.root.position.clone();
    // 공격해 온 쪽의 반대로 튕겨 나간다
    const away = from ? start.clone().sub(from) : new THREE.Vector3();
    away.y = 0;
    if (away.lengthSq() < 1e-4) away.set(0, 0, v.side === 'cho' ? 1 : -1);
    away.normalize().multiplyScalar(2.2);
    const spin = (Math.random() < 0.5 ? -1 : 1) * 9;
    await this.tweens.run({ duration: delay, update: () => {} });
    this.effects.sparkle(start.clone().setY(0.4));
    this.shakeAmp = Math.max(this.shakeAmp, 0.08);
    await this.tweens.run({
      duration: 0.65,
      easing: ease.out,
      update: (e, k) => {
        v.root.position.set(start.x + away.x * e, start.y + Math.sin(k * Math.PI * 0.85) * 1.6, start.z + away.z * e);
        v.root.rotation.z = spin * e * 0.3;
        v.root.rotation.x = spin * e * 0.2;
        v.root.scale.setScalar(Math.max(0.001, 1 - k * k));
      },
    });
    this.pieceRoot.remove(v.root);
    disposePiece(v);
  }

  private shakePiece(id: string) {
    const v = this.views.get(id);
    if (!v) return;
    void this.tweens.run({
      duration: 0.4,
      easing: ease.linear,
      update: (_, k) => {
        v.model.rotation.z = Math.sin(k * Math.PI * 6) * 0.2 * (1 - k);
      },
    });
  }

  private celebrate(result: GameResult) {
    const colors = result.winner
      ? [TEAM[result.winner].main, TEAM[result.winner].light, '#f3d08a', '#ffffff']
      : ['#f3d08a', '#ffffff', TEAM.cho.light, TEAM.han.light];
    this.effects.celebrate(colors);
    this.glowPulse = 3;
    if (!result.winner) return;
    // 이긴 쪽 궁이 두 바퀴 돌며 폴짝
    for (const v of this.views.values()) {
      if (v.type !== 'K' || v.side !== result.winner) continue;
      void this.tweens.run({
        duration: 1.1,
        delay: 0.3,
        easing: ease.linear,
        update: (_, k) => {
          v.model.position.y = Math.sin(Math.PI * k) * 1.6;
          v.model.rotation.y = ease.inOut(k) * Math.PI * 4;
        },
      });
    }
  }

  /** 받침·이름표·한자알 글자가 향하는 쪽 */
  private plateFacing(side: Side): number {
    const s = this.snap!;
    if (s.viewMode === 'rotate') return s.turn === 'cho' ? 0 : Math.PI;
    return side === 'cho' ? 0 : Math.PI;
  }

  // ───────── 카메라 ─────────

  private resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.dirty = true;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.fit();
  }

  private homeAzimuth() {
    const s = this.snap;
    return s?.viewMode === 'rotate' && s.turn === 'han' ? Math.PI : 0;
  }

  /** 패널 여백을 뺀 자리에 판과 말이 다 보이도록 카메라 거리를 찾는다 */
  private fit() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const mode = this.snap?.viewMode ?? 'face';
    if (!w || !h) return;
    const { padX, padY } = computeLayout(w, h);
    const limX = 1 - (2 * padX) / w;
    const limY = 1 - (2 * padY) / h;
    const pts: THREE.Vector3[] = [];
    for (const x of [-FRAME_HALF.x, FRAME_HALF.x]) for (const z of [-FRAME_HALF.z, FRAME_HALF.z]) pts.push(new THREE.Vector3(x, 0, z));
    for (const x of [-4.4, 4.4]) for (const z of [-4.9, 4.9]) pts.push(new THREE.Vector3(x, 1.2, z));

    const cam = this.camera.clone();
    let lo = 5,
      hi = 150;
    for (let i = 0; i < 30; i++) {
      const d = (lo + hi) / 2;
      this.place(cam, 0, ELEVATION[mode], d);
      const ok = pts.every((p) => {
        const v = p.clone().project(cam);
        return Math.abs(v.x) <= limX && Math.abs(v.y) <= limY && v.z < 1;
      });
      if (ok) hi = d;
      else lo = d;
    }
    this.homeDist = hi;
    this.controls.minDistance = hi * 0.45;
    this.controls.maxDistance = hi * 1.3;
    if (!this.snap) this.cam.dist = hi;
  }

  private place(cam: THREE.PerspectiveCamera, az: number, el: number, d: number) {
    cam.position.set(Math.sin(az) * Math.cos(el) * d, Math.sin(el) * d, Math.cos(az) * Math.cos(el) * d);
    cam.up.set(0, 1, 0);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld();
  }

  /** 카메라를 한 걸음 옮기고, 아직 움직이는 중이면 true */
  private updateCamera(dt: number): boolean {
    const s = this.snap;
    if (this.userOrbit === 'settling') {
      this.settleLeft -= dt;
      if (this.settleLeft <= 0) {
        // 손으로 돌려 놓은 자리에서부터 원래 시점으로 부드럽게 돌아간다
        const p = this.camera.position;
        this.cam.dist = p.length();
        this.cam.el = Math.asin(Math.min(1, p.y / this.cam.dist));
        this.cam.az = Math.atan2(p.x, p.z);
        this.userOrbit = 'idle';
      }
    }
    if (this.userOrbit !== 'idle') {
      this.controls.update();
      return true;
    }
    const k = 1 - Math.exp(-dt * 4.5);
    const dAz = wrapAngle(this.homeAzimuth() - this.cam.az);
    const dEl = ELEVATION[s?.viewMode ?? 'face'] - this.cam.el;
    const dDist = this.homeDist - this.cam.dist;
    const moving = Math.abs(dAz) + Math.abs(dEl) + Math.abs(dDist) * 0.05 > 1e-4;
    this.cam.az += dAz * k;
    this.cam.el += dEl * k;
    this.cam.dist += dDist * k;
    this.place(this.camera, this.cam.az, this.cam.el, this.cam.dist);
    const shaking = this.shakeAmp > 0.001;
    if (shaking) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeAmp;
      this.camera.position.z += (Math.random() - 0.5) * this.shakeAmp;
      this.shakeAmp *= Math.exp(-dt * 12);
    }
    return moving || shaking;
  }

  // ───────── 매 프레임 ─────────

  private frame = () => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.time += dt;
    const t = this.time;
    const s = this.snap;
    this.tweens.update(dt);

    let busy = this.tweens.active;
    if (s) {
      const lean = LEAN[s.viewMode];
      const selId = s.selected ? at(s.board, s.selected)?.id : null;
      const kk = 1 - Math.exp(-dt * 8);
      for (const [id, v] of this.views) {
        const dRot = wrapAngle(this.plateFacing(v.side) - v.plate.rotation.y);
        v.plate.rotation.y += dRot * kk;
        if (Math.abs(dRot) > 1e-3) busy = true;
        if (v.figure) {
          const dLean = -lean - v.figure.rotation.x;
          v.figure.rotation.x += dLean * kk;
          if (Math.abs(dLean) > 1e-3) busy = true;
        }
        if (!this.moving.has(id) && !(s.result && v.type === 'K' && v.side === s.result.winner)) {
          const selected = id === selId;
          const lift = selected ? 0.3 + Math.abs(Math.sin(t * 4.5)) * 0.1 : 0;
          const dy = lift - v.model.position.y;
          v.model.position.y += dy * (1 - Math.exp(-dt * 14));
          if (selected || Math.abs(dy) > 1e-3) busy = true;
        }
      }
    }
    this.effects.update(dt, t);
    busy ||= this.effects.busy;
    if (this.glowPulse > 0) {
      busy = true;
      this.glowPulse = Math.max(0, this.glowPulse - dt);
      this.glow.intensity = 10 * (1 + 2.5 * Math.abs(Math.sin(this.glowPulse * 5)) * (this.glowPulse / 3));
    }
    busy = this.updateCamera(dt) || busy;
    if (busy || this.dirty) this.renderer.render(this.scene, this.camera);
    this.dirty = busy;
  };

  // ───────── 터치 ─────────

  private pick(clientX: number, clientY: number): Pos | null {
    const r = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);

    // 서 있는 캐릭터를 누르면 그 말이 있는 칸
    const hits = this.raycaster.intersectObjects(this.pieceRoot.children, true);
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object;
      while (o && !o.userData.pieceId) o = o.parent;
      const id = o?.userData.pieceId as string | undefined;
      const pos = id && this.views.has(id) ? this.posById.get(id) : undefined;
      if (pos) return pos;
    }
    const hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, hit)) return null;
    const p = fromWorld(hit);
    if (!onBoard(p)) return null;
    const w = toWorld(p);
    return Math.hypot(w.x - hit.x, w.z - hit.z) < 0.5 ? p : null;
  }

  private onPointerDown = (e: PointerEvent) => {
    this.pointers.add(e.pointerId);
    // 두 번째 손가락이 닿으면 돌려 보기 → 탭 취소
    if (this.pointers.size > 1 || e.button === 2) {
      this.cancelPress();
      return;
    }
    const id = e.pointerId;
    const x = e.clientX;
    const y = e.clientY;
    const timer = window.setTimeout(() => {
      if (!this.press || this.press.id !== id) return;
      this.press.fired = true;
      const p = this.pick(x, y);
      if (p && this.snap && at(this.snap.board, p)) this.handlers.onLongPress(p);
    }, LONG_PRESS_MS);
    this.press = { id, x, y, timer, fired: false };
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.press || this.press.id !== e.pointerId) return;
    if (Math.hypot(e.clientX - this.press.x, e.clientY - this.press.y) > 14) {
      window.clearTimeout(this.press.timer);
      this.press.fired = true; // 끌기는 탭으로 치지 않음
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId);
    if (!this.press || this.press.id !== e.pointerId) return;
    const { fired, timer, x, y } = this.press;
    window.clearTimeout(timer);
    this.press = null;
    if (fired || e.type === 'pointercancel') return;
    this.handlers.onTap(this.pick(x, y));
  };

  private cancelPress = () => {
    if (this.press) window.clearTimeout(this.press.timer);
    this.press = null;
  };
}
