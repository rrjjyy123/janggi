import type * as THREE from 'three';
import type { PieceType, Side } from '../../game/types';
import { chick } from './chick';
import { dog } from './dog';
import { elephant } from './elephant';
import { kangaroo } from './kangaroo';
import { lion } from './lion';
import { Kit } from './parts';
import { pony } from './pony';
import { rhino } from './rhino';

const BUILDERS: Record<PieceType, (k: Kit) => void> = {
  K: lion,
  A: dog,
  R: rhino,
  C: kangaroo,
  H: pony,
  E: elephant,
  P: chick,
};

const baked = new Map<string, THREE.Group>();

/**
 * 앞(+Z)을 보고 서 있는 캐릭터. 원점은 발바닥.
 * 종류·팀마다 한 번만 조립해서 합친 뒤, 이후에는 geometry·재질을 공유하는 복제본을 준다.
 */
export function buildAnimal(type: PieceType, side: Side): THREE.Group {
  const key = type + side;
  let g = baked.get(key);
  if (!g) {
    const kit = new Kit(side);
    BUILDERS[type](kit);
    g = kit.bake();
    baked.set(key, g);
  }
  return g.clone();
}
