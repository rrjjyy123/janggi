# 장기 3D

태블릿 한 대를 가운데 두고 두 사람이 마주 앉아 두는 3D 장기입니다. 한자를 몰라도 둘 수 있도록 말을 **역할별 복장을 한 동물 캐릭터**로도 바꿀 수 있습니다.

## 특징

- **두 가지 말**: 전통 팔각 원목 한자알 / 캐릭터 말 (버튼 하나로 전환)
  - 궁: 익선관·곤룡포의 사자 임금 · 사: 사모·관복의 강아지 참모 · 차: 나무 전차를 탄 코뿔소
  - 포: 청동 대포를 멘 캥거루 · 마: 마갑·투구의 조랑말 · 상: 가마를 얹은 전투 코끼리 · 졸/병: 전립·창·방패의 병아리
  - 양 팀 캐릭터는 서로 상대 진영을 바라봅니다.
- **규칙 도움**: 말을 누르면 갈 수 있는 곳 표시, 규칙에 어긋나는 수는 둘 수 없음, 장군·멍군·외통 알림, 말을 길게 누르면 움직이는 법 카드
- **시점**: 마주 앉기(위에서 보기, 두 손가락으로 돌려 보기 — 손을 떼면 원위치) / 차례마다 회전
- 상차림(마·상 배치) 4종 선택, 한 수 쉬기, 기권, 효과음, 화질 설정(고화질/저사양 기기)
- 외부 모델·이미지·음원 없이 three.js 로 모두 절차 생성 (오프라인 동작, 글꼴만 Google Fonts)

## 실행

```bash
npm install
npm run dev      # http://localhost:5173 (같은 와이파이의 태블릿에서도 접속 가능)
npm run test     # 규칙 엔진 단위 테스트
npm run build    # dist/ 에 배포용 빌드
```

> Windows 에서 프로젝트 폴더 경로에 한글이 있으면 `npm run build` 가 Rollup 네이티브 모듈 오류로 멈출 수 있습니다. 영문 경로에서 빌드하세요. (개발 서버·테스트는 영향 없음)

## 배포

`main` 에 푸시하면 GitHub Actions(`.github/workflows/deploy.yml`)가 테스트 → 빌드 → GitHub Pages 배포를 합니다.
주소: https://rrjjyy123.github.io/janggi/

## 구조

| 경로 | 내용 |
|---|---|
| `src/game/` | 규칙 엔진 (말 이동, 궁성, 장군·외통 판정) + 테스트 |
| `src/store/gameStore.ts` | 게임 상태 (zustand) |
| `src/three/Scene.ts` | 렌더러·조명·카메라·애니메이션·터치 |
| `src/three/animals/` | 캐릭터 7종 (도형 조립 후 재질별로 합쳐 draw call 절감) |
| `src/three/boardMesh.ts`, `hanjaPiece.ts`, `textures.ts` | 절차 생성 나뭇결 판·한자알 |
| `src/three/effects.ts` | 이동 표시 발광, 먼지·반짝이·색종이 |
| `src/ui/` | React UI (패널, 알림, 규칙 카드, 설정, 시작 화면) |

기술: Vite · React · TypeScript · three.js · zustand · Tailwind CSS
