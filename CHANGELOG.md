# 변경 기록

이 프로젝트의 중요한 변경사항을 이 문서에 기록합니다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 참고하고, 버전은 [Semantic Versioning](https://semver.org/lang/ko/)을 따르는 것을 목표로 합니다.

## [Unreleased]

### 추가

- 공개 사용자 피드백을 반영한 월간 대회 캘린더와 날짜별 전체 일정 보기
- 여러 주최기관 필터, 관심 주최기관 브라우저 저장, 관심 기관만 보기
- 한국 시간 기준 월간 일정 구성과 브라우저 저장 유틸리티 단위 테스트

### 수정

- Devpost 대회 설명에서 한글 조사와 영문 기관명이 어색하게 결합되던 문구
- 모바일 메뉴가 열린 동안 배경 페이지가 함께 스크롤되던 문제
- Cloudflare JavaScript Detection과 충돌하던 CSP를 요청별 nonce 방식으로 강화
- 운영 페이지에 명시적인 CodePes 파비콘 추가
- 새 보안 응답이 즉시 반영되도록 운영 HTML 메타데이터 갱신

## [0.1.0] - 2026-07-26

### 확인

- 공개 GitHub 저장소의 CI와 Sites 프로덕션 배포 검증
- 검색, 필터, 관심 대회 저장, 공유, 제보, 모바일 메뉴의 실제 브라우저 흐름 검증
- 정적 호스팅에서도 적용되는 소셜 이미지 절대 주소와 CSP 메타 fallback

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
- AtCoder 공식 예정 대회 표 자동 수집
- CodeChef 공식 JSON 예정 대회 자동 수집
- Devpost 공개 목록과 공식 일정 페이지를 결합한 해커톤 자동 수집
- Devpost 자동 수집 범위를 마감 임박순 최대 80개로 확대
- CTFtime 공식 API 기반 보안 CTF 자동 수집
- itch.io 공식 Upcoming 목록과 상세 참가 규정을 결합한 게임잼 자동 수집
- 해외 대회를 한국에서 온라인 참가 가능한 항목으로 제한하는 출처별 검증 정책
- Devpost 공식 규정의 전 세계·대한민국 참가 가능 근거 확인
- CTFtime `Online`·`Open` 항목과 itch.io `누구나 온라인 참가 가능` 항목만 게시
- Devpost AI·머신러닝·LLM 주제 대회의 AI·데이터 분류와 해커톤 교차 필터
- 세부 참가 조건을 단정하지 않는 `대회별 확인` 자격 필터
- 한국정보올림피아드 공식 1·2차 대회 안내 감시와 접수 중 회차 자동 수집
- 한국정보기술진흥원 청소년 IT경시대회 현재 공지·지난 회차를 함께 읽는 상·하반기 대회 자동 수집
- 국민대학교 알고리즘 대회 공식 연례 안내 감시와 접수 중 회차 자동 수집
- UCPC 최신 연도 공식 안내와 온라인 예선 일정 자동 수집
- SCPC·이화여대 전국 여고생 대회·호남권 대학 연합 청소년 대회·Baekjoon 공식 대학 대회 목록 감시 출처
- 정확한 접수·진행 정보가 더 필요한 ICPC Korea 자동 게시 보류 출처 설정

[Unreleased]: https://github.com/psh1234567890/codepes/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/psh1234567890/codepes/releases/tag/v0.1.0
