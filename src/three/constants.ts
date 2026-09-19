import * as THREE from 'three';
import type { PieceType, Pos, Side } from '../game/types';

/** 판 교차점 → 월드 좌표. 초(아래쪽)가 +Z, 한(위쪽)이 -Z. 교차점 간격 1. */
export const toWorld = (p: Pos, y = 0) => new THREE.Vector3(p.x - 4, y, 4.5 - p.y);
export const fromWorld = (v: THREE.Vector3): Pos => ({ x: Math.round(v.x + 4), y: Math.round(4.5 - v.z) });

export const TEAM = {
  cho: { name: '초', hanja: '楚', main: '#1d7a45', light: '#6fc28e', dark: '#0f4a29', text: '#17683a' },
  han: { name: '한', hanja: '漢', main: '#b8302c', light: '#f08a78', dark: '#6e1614', text: '#ac2622' },
} as const;

export const HANJA: Record<PieceType, Record<Side, string>> = {
  K: { cho: '楚', han: '漢' },
  A: { cho: '士', han: '士' },
  R: { cho: '車', han: '車' },
  C: { cho: '包', han: '包' },
  H: { cho: '馬', han: '馬' },
  E: { cho: '象', han: '象' },
  P: { cho: '卒', han: '兵' },
};

export const HANGUL: Record<PieceType, Record<Side, string>> = {
  K: { cho: '궁', han: '궁' },
  A: { cho: '사', han: '사' },
  R: { cho: '차', han: '차' },
  C: { cho: '포', han: '포' },
  H: { cho: '마', han: '마' },
  E: { cho: '상', han: '상' },
  P: { cho: '졸', han: '병' },
};

export const ANIMAL: Record<PieceType, { name: string; emoji: string }> = {
  K: { name: '사자 임금', emoji: '🦁' },
  A: { name: '강아지 참모', emoji: '🐶' },
  R: { name: '코뿔소 전차', emoji: '🦏' },
  C: { name: '캥거루 포수', emoji: '🦘' },
  H: { name: '기마', emoji: '🐴' },
  E: { name: '전투 코끼리', emoji: '🐘' },
  P: { name: '병아리 병사', emoji: '🐥' },
};

export const HANJA_FONT = '"Noto Serif KR", "Batang", "바탕", "Songti SC", serif';
export const UI_FONT = '"Noto Sans KR", "Malgun Gothic", sans-serif';
