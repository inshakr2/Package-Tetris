import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const FIELD_GUIDE_PATH = join(process.cwd(), "docs/field-demo-user-guide.md");

describe("field demo user guide document", () => {
  it("시연 브랜치와 최종 검증 명령은 V2 기준을 안내한다", () => {
    // Given
    const document = readFileSync(FIELD_GUIDE_PATH, "utf8");

    // When / Then
    assert.match(document, /main.*검증된 현장 시연 기준/);
    assert.match(document, /v2.*다음 현장 피드백 개발 기준/);
    assert.match(document, /npm run v2:verify/);
    assert.doesNotMatch(document, /main` 브랜치 기준으로 프로젝트를 내려받으면 된다/);
    assert.doesNotMatch(document, /시연 전 최종 확인[\s\S]*npm run v1:verify/);
  });

  it("V2 최종 검증 실패 시 자동 생성 파일과 오류 전달 기준을 안내한다", () => {
    // Given
    const document = readFileSync(FIELD_GUIDE_PATH, "utf8");

    // When / Then
    assert.match(document, /npm run v2:verify/);
    assert.match(document, /next-env\.d\.ts/);
    assert.match(document, /자동 생성 파일/);
    assert.match(document, /git diff --check/);
    assert.match(document, /공백 오류 검사/);
    assert.match(document, /UI 변경[\s\S]*360px[\s\S]*390px[\s\S]*768px[\s\S]*1280px/);
    assert.match(document, /화면 기능 불량이 아니라/);
    assert.match(document, /터미널 마지막 오류/);
    assert.match(document, /변경된 파일명/);
    assert.match(document, /개발 담당자/);
  });

  it("현장 PC audit 안내는 V2 핵심 기능 검증 범위를 과소 안내하지 않는다", () => {
    // Given
    const document = readFileSync(FIELD_GUIDE_PATH, "utf8");

    // When / Then
    assert.match(document, /npm run field:audit/);
    assert.match(document, /현장형 preset 대량 적재/);
    assert.match(document, /V2 핵심 기능 검증/);
    assert.match(document, /부분 지지 허용 55% 현장 검증/);
    assert.match(document, /오버행 파레트 추천 현장 검증/);
    assert.match(document, /현장 바람개비 적재 검증 - 기본 8개/);
    assert.match(document, /저장 박스 엑셀 일괄등록 현장 검증/);
    assert.match(document, /현재 작업 엑셀 등록 현장 검증/);
    assert.match(document, /추가 박스 시뮬레이션 현장 검증/);
    assert.match(document, /현장 바람개비 적재 검증 - 혼합 추가 시뮬레이션 결과/);
    assert.doesNotMatch(document, /기능 검증에는 `부분 지지 허용 55% 현장 검증`과 `추가 박스 시뮬레이션 현장 검증`이 포함된다/);
  });

  it("박스 .xlsx 일괄등록 흐름과 오류 수정 기준을 현장 언어로 안내한다", () => {
    // Given
    const document = readFileSync(FIELD_GUIDE_PATH, "utf8");

    // When / Then
    assert.match(document, /엑셀로 박스 일괄등록/);
    assert.match(document, /\.xlsx/);
    assert.match(document, /샘플 파일 다운로드/);
    assert.match(document, /미리보기/);
    assert.match(document, /일괄등록 적용/);
    assert.match(document, /바로 저장되지|즉시 저장되지/);
    assert.match(
      document,
      /상위그룹[\s\S]*하위그룹[\s\S]*박스명[\s\S]*가로mm[\s\S]*세로mm[\s\S]*높이mm[\s\S]*무게kg[\s\S]*깨짐주의/,
    );
    assert.match(document, /오류 행/);
    assert.match(document, /행 번호/);
    assert.match(document, /사유/);
    assert.doesNotMatch(document, /작업 지시서/);
    assert.doesNotMatch(document, /배치 상세/);
    assert.doesNotMatch(document, /쌓는 순서/);
  });

  it("무게 입력은 선택 정보이며 현재 적재 계산에는 반영되지 않는다고 안내한다", () => {
    // Given
    const document = readFileSync(FIELD_GUIDE_PATH, "utf8");

    // When / Then
    assert.match(document, /무게는 선택 입력/);
    assert.match(document, /무게는 검색과 엑셀\/백업용 정보/);
    assert.match(document, /현재 적재 계산에는 반영하지 않습니다/);
    assert.doesNotMatch(document, /무게를 입력하면 적재 결과가 달라진다/);
  });

  it("시연 체크리스트는 .xlsx 일괄등록과 오류 행 확인을 포함한다", () => {
    // Given
    const document = readFileSync(FIELD_GUIDE_PATH, "utf8");

    // When / Then
    assert.match(document, /\.xlsx 일괄등록 가능/);
    assert.match(document, /\.xlsx 샘플 파일 다운로드 가능/);
    assert.match(document, /오류 행과 사유 확인 가능/);
    assert.match(document, /3D와 공간 확인/);
    assert.doesNotMatch(document, /작업 지시서/);
  });

  it("현재 작업 엑셀 등록은 중복 행 합산과 기존 설정 유지 경고를 안내한다", () => {
    // Given
    const document = readFileSync(FIELD_GUIDE_PATH, "utf8");

    // When / Then
    assert.match(document, /현재 작업 엑셀 미리보기/);
    assert.match(document, /같은 박스명이 여러 행/);
    assert.match(document, /합산된 행/);
    assert.match(document, /기존 설정 유지/);
    assert.match(document, /적재위치타입/);
  });

  it("현재 작업 엑셀 등록은 박스명 보정 범위와 오류 기준을 안내한다", () => {
    // Given
    const document = readFileSync(FIELD_GUIDE_PATH, "utf8");

    // When / Then
    assert.match(document, /앞뒤 공백과 대소문자는 보정/);
    assert.match(document, /글자가 다른 박스명은 오류 행/);
    assert.match(document, /저장된 박스에 없는 박스명이 있거나/);
    assert.doesNotMatch(document, /저장된 박스명과 정확히 일치/);
  });

  it("추가 박스 시뮬레이션 가이드는 선택 순서 기반 우선순위를 안내한다", () => {
    // Given
    const document = readFileSync(FIELD_GUIDE_PATH, "utf8");

    // When / Then
    assert.match(document, /박스를 선택한 순서/);
    assert.match(document, /1순위\/2순위\/3순위/);
    assert.match(document, /드래그하거나 우측의 위로\/아래로 버튼/);
    assert.match(document, /선택 해제/);
    assert.match(document, /지정 수량 조건/);
    assert.match(document, /순위로 이동됨/);
    assert.match(document, /다시 계산/);
    assert.match(document, /지정 수량대로 계산/);
    assert.match(document, /선택 순서대로 계산/);
    assert.match(document, /선택 순서와 수량대로 계산/);
    assert.match(document, /선택 순서 결과/);
    assert.match(document, /박스별 우선 결과/);
    assert.doesNotMatch(document, /조건 반영 결과 계산/);
    assert.doesNotMatch(document, /우선순위 결과 계산/);
    assert.doesNotMatch(document, /먼저 추가 또는 `최우선 추가`/);
    assert.doesNotMatch(document, /지정 우선 결과/);
  });

  it("현장 시연 순서는 공간 치수를 가로/세로/높이 용어로 안내한다", () => {
    // Given
    const document = readFileSync(FIELD_GUIDE_PATH, "utf8");

    // When / Then
    assert.match(document, /가로, 세로, 높이, 안전 여유/);
    assert.doesNotMatch(document, /폭, 깊이, 높이, 안전 여유/);
  });

  it("개발 시연의 오프라인 준비 상태는 자동 새로고침 방지 정책과 구분해서 안내한다", () => {
    // Given
    const document = readFileSync(FIELD_GUIDE_PATH, "utf8");

    // When / Then
    assert.match(document, /npm run dev[\s\S]*자동 새로고침/);
    assert.match(document, /서비스워커 등록을 끄므로[\s\S]*지원되지 않음/);
    assert.match(document, /오류가 아닙니다/);
    assert.match(document, /정적 빌드|배포|설치형 사용/);
    assert.match(document, /준비됨/);
  });
});
