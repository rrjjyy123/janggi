export const ease = {
  linear: (t: number) => t,
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  in: (t: number) => t * t * t,
  outBack: (t: number) => {
    const c1 = 1.70158;
    return 1 + (c1 + 1) * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  outBounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

export interface TweenOpts {
  duration: number;
  delay?: number;
  easing?: (t: number) => number;
  /** e: 이징 적용 값, k: 그냥 진행률 (포물선 등에 씀) */
  update: (e: number, k: number) => void;
}

interface Running extends Required<Omit<TweenOpts, 'delay'>> {
  t: number;
  resolve: () => void;
}

/** 렌더 루프의 dt 로 굴러가는 짧은 애니메이션들. 끝나면 Promise 가 풀린다. */
export class Tweens {
  private list = new Set<Running>();

  run(o: TweenOpts): Promise<void> {
    return new Promise((resolve) => {
      this.list.add({ t: -(o.delay ?? 0), duration: o.duration, easing: o.easing ?? ease.inOut, update: o.update, resolve });
    });
  }

  get active() {
    return this.list.size > 0;
  }

  update(dt: number) {
    for (const tw of this.list) {
      tw.t += dt;
      if (tw.t < 0) continue;
      const k = Math.min(1, tw.t / tw.duration);
      tw.update(tw.easing(k), k);
      if (k >= 1) {
        this.list.delete(tw);
        tw.resolve();
      }
    }
  }
}
