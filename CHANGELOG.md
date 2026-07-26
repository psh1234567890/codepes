# 변경 기록

이 프로젝트의 중요한 변경사항을 이 문서에 기록합니다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 참고하고, 버전은 [Semantic Versioning](https://semver.org/lang/ko/)을 따르는 것을 목표로 합니다.

## [Unreleased]

### 확인

- 공개 GitHub 저장소의 CI와 Sites 프로덕션 배포 검증
- 검색, 필터, 관심 대회 저장, 공유, 제보, 모바일 메뉴의 실제 브라우저 흐름 검증
- 정적 호스팅에서도 적용되는 소셜 이미지 절대 주소와 CSP 메타 fallback

### 추가

- AtCoder 공식 예정 대회 표 자동 수집
- CodeChef 공식 JSON 예정 대회 자동 수집
- Devpost 공개 목록과 공식 일정 페이지를 결합한 해커톤 자동 수집
- Devpost 자동 수집 범위를 최대 20개에서 40개로 확대
- CTFtime 공식 API 기반 보안 CTF 자동 수집
- itch.io 공식 Upcoming 페이지 기반 게임잼 자동 수집
- 해외 대회를 한국에서 온라인 참가 가능한 항목으로 제한하는 출처별 검증 정책
- Devpost 공식 규정의 전 세계·대한민국 참가 가능 근거 확인
- CTFtime `Online`·`Open` 항목만 게시하고 itch.io 자동 게시 보류
- 세부 참가 조건을 단정하지 않는 `대회별 확인` 자격 필터

### 계획

- 첫 버전 태그와 릴리스 노트 발행
- 실제 사용자 피드백을 반영한 데이터 출처 확대

## [0.1.0] - 2026-07-25

### 추가

- 개발 대회 검색, 유형·자격·방식 필터와 정렬
- 브라우저 `localStorage` 기반 관심 대회 저장과 저장 목록 필터
- 전체, 저장, 개별 대회의 `.ics` 캘린더 내보내기
- 대회별 공유 링크와 공식 페이지 이동
- GitHub 이슈를 통한 대회 제보·수정 요청 흐름
- Codeforces 공식 API 동기화와 DACON·DAKER 수동 검증 데이터 병합
- GitHub Raw 최신 JSON의 런타임 검증, 갱신 시각 비교, 번들 fallback
- 정기 데이터 갱신을 위한 GitHub Actions 워크플로
- TypeScript 타입 검사, Vitest 테스트, 프로덕션 빌드를 묶은 검증 명령
- MIT 라이선스와 기여, 보안, 개인정보, 지원, 데이터 정책 문서

[Unreleased]: https://github.com/psh1234567890/codepes/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/psh1234567890/codepes/releases/tag/v0.1.0
