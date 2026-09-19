import * as THREE from 'three';
import type { Side } from '../game/types';
import { TEAM } from './constants';
import { woodTextures } from './textures';

/**
 * 캐릭터·장비에 쓰는 재질 이름.
 * '#rrggbb' 로 주면 그 색의 털 재질.
 */
export type MatName =
  | 'team' // 팀 색 옷감
  | 'teamDark'
  | 'teamLacquer' // 팀 색 옻칠 (받침·방패)
  | 'gold'
  | 'bronze'
  | 'iron'
  | 'black' // 갓·사모 같은 검은 옻칠
  | 'wood'
  | 'darkWood'
  | 'leather'
  | 'paper'
  | 'jade'
  | 'eye'
  | 'white'
  | 'pink'
  | 'ember'
  | `#${string}`;

const cache = new Map<string, THREE.Material>();

function build(name: MatName, side: Side): THREE.Material {
  const t = TEAM[side];
  if (name.startsWith('#')) {
    return new THREE.MeshStandardMaterial({ color: name, roughness: 0.7 });
  }
  switch (name) {
    case 'team':
      return new THREE.MeshStandardMaterial({ color: t.main, roughness: 0.75 });
    case 'teamDark':
      return new THREE.MeshStandardMaterial({ color: t.dark, roughness: 0.72 });
    case 'teamLacquer':
      return new THREE.MeshPhysicalMaterial({ color: t.main, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 });
    case 'gold':
      return new THREE.MeshStandardMaterial({ color: '#e2b04a', metalness: 0.85, roughness: 0.3 });
    case 'bronze':
      return new THREE.MeshStandardMaterial({ color: '#a8703a', metalness: 0.85, roughness: 0.38 });
    case 'iron':
      return new THREE.MeshStandardMaterial({ color: '#7c858f', metalness: 0.75, roughness: 0.42 });
    case 'black':
      return new THREE.MeshPhysicalMaterial({ color: '#1c1918', roughness: 0.45, clearcoat: 0.7, clearcoatRoughness: 0.25 });
    case 'wood': {
      const w = woodTextures('maple', 256);
      return new THREE.MeshStandardMaterial({ ...w, bumpScale: 0.3, roughness: 0.45 });
    }
    case 'darkWood': {
      const w = woodTextures('walnut', 256);
      return new THREE.MeshStandardMaterial({ ...w, bumpScale: 0.3, roughness: 0.4 });
    }
    case 'leather':
      return new THREE.MeshStandardMaterial({ color: '#6b3f22', roughness: 0.6 });
    case 'paper':
      return new THREE.MeshStandardMaterial({ color: '#f1e6cc', roughness: 0.85 });
    case 'jade':
      return new THREE.MeshPhysicalMaterial({ color: '#cfe6cf', roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 });
    case 'eye':
      return new THREE.MeshPhysicalMaterial({ color: '#121216', roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.03 });
    case 'white':
      return new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.6, roughness: 0.3 });
    case 'pink':
      return new THREE.MeshStandardMaterial({ color: '#f59aac', roughness: 0.85 });
    case 'ember':
      return new THREE.MeshStandardMaterial({ color: '#ffb060', emissive: '#ff6a10', emissiveIntensity: 2.2 });
  }
  throw new Error(`unknown material ${name}`);
}

/** 팀 색이 들어가는 재질만 팀별로 따로, 나머지는 공유 */
export function material(name: MatName, side: Side): THREE.Material {
  const teamed = name.startsWith('team');
  const key = teamed ? `${name}|${side}` : name;
  let m = cache.get(key);
  if (!m) {
    m = build(name, side);
    cache.set(key, m);
  }
  return m;
}
