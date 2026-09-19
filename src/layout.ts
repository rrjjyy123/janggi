/**
 * 화면 모양에 따라 플레이어 패널이 차지할 자리.
 * 가로 화면: 판 양옆 기둥(초는 오른쪽 아래, 한은 왼쪽 위)
 * 세로 화면: 판 위아래 띠(초는 아래, 한은 위)
 * 3D 카메라는 이 여백을 뺀 나머지에 판이 꽉 차도록 맞춘다.
 */
export interface Layout {
  landscape: boolean;
  padX: number;
  padY: number;
}

export function computeLayout(w: number, h: number): Layout {
  const landscape = w / h > 1.15;
  if (landscape) return { landscape, padX: Math.min(250, w * 0.22), padY: 8 };
  return { landscape, padX: 8, padY: Math.min(104, h * 0.12) };
}
