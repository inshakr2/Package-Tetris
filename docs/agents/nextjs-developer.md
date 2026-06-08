# Next.js Developer Role Memory

## Role Scope

Next.js 개발 역할은 App Router static export, 프론트 단독 구조, IndexedDB 기반 작업본, JSON 백업 파일, Three.js client-only 3D 뷰어를 안정적으로 유지하면서 작은 증분으로 구현한다.

## Implementation Principles

- 기존 컴포넌트와 순수 유틸 구조를 우선 사용한다.
- 서버 기능, 인증, API route, DB 연동은 V1 범위 밖이다.
- 브라우저 저장과 가져오기 데이터는 비신뢰 입력으로 취급한다.
- UI 변경은 기존 저장, 가져오기, 3D 렌더링, 체이닝 흐름을 깨지 않도록 좁게 적용한다.
- 기술 용어는 데이터/문서에는 남기되 주 화면 문구에서는 현장 언어로 바꾼다.

## Likely Files

- `src/components/tetris-workspace-app.tsx`
- `src/app/globals.css`
- `src/lib/workspace/layout-sections.ts`
- `src/lib/workspace/layout-sections.test.ts`
- `docs/tetris-ui-planning-draft.md`
- `docs/agents/*.md`

## Verification Standards

- `npm test`
- `npx tsc --noEmit`
- `npm run build`
- 360px, 390px, 768px, 1280px 브라우저 검증
- 모바일에서 horizontal overflow 없음
- 주요 CTA가 44~48px 이상으로 터치 가능한지 확인
- 3D 뷰어가 결과 생성 후 여전히 렌더링되는지 확인

## Known Technical Risks

- sticky topbar와 sticky mobile actions가 포커스된 입력이나 버튼을 가리지 않아야 한다.
- 모바일 3D 뷰어는 WebGL 조작보다 버튼 대체 조작이 우선이다.
- `latest` 의존성 사용은 피하고 버전을 고정한다.
- 동적 import된 3D 컴포넌트는 static export 빌드를 깨지 않아야 한다.
