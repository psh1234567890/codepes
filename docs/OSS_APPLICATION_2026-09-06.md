# CodePes — Codex for Open Source 신청서

작성일: 2026-09-06 (한국 시간)
상태: 신청용 초안. 이 문서 작성과 사이트 개선 작업은 신청서 제출을 의미하지 않습니다.

## 기본 입력

- 공식 신청서: https://openai.com/form/codex-for-oss/
- 공식 안내: https://developers.openai.com/community/codex-for-oss
- 약관: https://learn.chatgpt.com/docs/codex-for-oss-terms
- GitHub username: `psh1234567890`
- GitHub repository URL: https://github.com/psh1234567890/codepes
- 운영 서비스: https://codepes.kro.kr/
- 역할: Primary maintainer
- 관심 혜택: API credits for my project
- 이름, ChatGPT 계정 이메일, OpenAI Organization ID는 본인이 공식 신청서에 직접 입력합니다. 이 문서에는 저장하지 않습니다.

## Why does this repository qualify? (494/500 characters)

```text
CodePes is a public MIT-licensed Korean competition finder deployed at codepes.kro.kr. It helps students and developers discover official contest information and distinguish registration deadlines from event starts. It offers organizer filters, calendars, configurable calendar reminders, and portable saved lists. With 3 GitHub stars, it is early-stage; its value is transparent source policies, automated refreshes, and community-feedback-driven improvements for Korean-speaking participants.
```

한국어 취지: 한국어로 공식 대회 정보를 찾고 신청 마감과 대회 시작을 구분하는 실용적 가치를 설명합니다. 관심 기관 필터, 캘린더 알림과 저장 목록 이동을 제시하되, 별 3개의 초기 프로젝트라는 사실을 함께 밝힙니다.

## How will you use API credits for your project? (481/500 characters)

```text
I will use API credits to help maintain source adapters, compare changed official rules and dates, suggest duplicate checks, draft regression tests, triage issues, review PR risks, and prepare Korean/English release notes. These are planned maintainer workflows, not existing AI features. Outputs will be checked against official sources; publication, issue closure, and merges will require maintainer approval. Private data and security findings will stay out of public summaries.
```

한국어 취지: 수집 코드 유지보수, 공식 규정·날짜 변경 비교, 중복 점검, 회귀 테스트와 이슈·PR 검토, 릴리스 작성에 사용할 계획입니다. AI 기능이 이미 운영 중이라고 주장하지 않습니다. 현재 대회 수집은 일반 코드 기반이며 새 API 통합은 아직 구현하지 않았습니다.

## Anything else we should know? (466/500 characters)

```text
I previously applied with Brawl Status KR under the same maintainer identity and account; CodePes is a separate repository. I do not seek duplicate personal benefits. CodePes has a public release, CI, documented contribution and security policies, and six-hour scheduled refreshes. Adoption is still small, and I do not claim verified user counts or an established external contributor base. Domestic contest coverage and source reliability remain active priorities.
```

한국어 취지: Brawl Status KR로 이전에 신청했다는 사실과 동일 유지관리자의 별도 저장소임을 공개합니다. 실제 사용자 수나 외부 기여를 과장하지 않고, 국내 출처와 신뢰도 개선을 앞으로의 과제로 설명합니다.

## 이번에 확인한 근거

- 공개 MIT 저장소, GitHub 별 3개·포크 0개. 확인일: 2026-09-06.
- 공개 릴리스: [v0.1.0](https://github.com/psh1234567890/codepes/releases/tag/v0.1.0), 2026-07-26.
- [달력과 주최기관 필터를 반영한 PR #14](https://github.com/psh1234567890/codepes/pull/14). 이슈에 사용자 의견을 정리한 것과 외부인이 코드를 기여한 것은 구분합니다.
- [정기 수집 실행 기록](https://github.com/psh1234567890/codepes/actions/workflows/sync-contests.yml): 조회한 최근 5회 성공. 가장 최근 확인한 실행은 [2026-09-06](https://github.com/psh1234567890/codepes/actions/runs/34012148389)입니다. 6시간 간격 설정이며 실제 실행 시각은 GitHub 스케줄 사정에 따라 늦어질 수 있습니다.
- 이번 실제 수집: 2026-09-06 14:41 KST, 60개 대회. PS 18개, 보안 30개, AI·데이터 10개, 해커톤 1개, 게임 1개. DACON 자동 수집으로 국내 AI 대회 3개를 추가하고, 기존 수집기에서 게임잼 1개를 확인해 직전 56개보다 4개 늘었습니다.
- 등록 출처 23곳 = 자동 수집 11곳 + 공고 감시 11곳 + 수동 검증 1곳. 이번 게시 항목을 제공한 출처는 7곳입니다. **23곳 모두가 현재 대회를 제공하는 것은 아닙니다.**
- Baekjoon 감시는 HTTP 404, itch.io 일부 상세는 요청 제한(HTTP 429)을 확인했습니다. itch.io는 유효한 게임잼 1개를 게시하면서 부분 실패 상태도 표시합니다. DAKER 수동 게시 데이터의 검증은 오래된 상태입니다. 모든 대회를 빠짐없이 수집한다고 주장하지 않습니다.
- 별·포크·목록 수·출처 상태는 변동합니다. 오래 후 제출한다면 수치를 다시 확인하세요. 본문에는 변동이 큰 대회 수를 넣지 않았습니다.

## 이번 개선과 남은 과제

### 구현한 개선

- DACON 수동 의존을 줄이는 공식 HTML 수집기. 국내 온라인 AI 대회의 정확한 신청 일정·참가 조건을 교차 확인하고 6시간 주기 수집에 포함.
- 합치기 전 출처별 레코드 검증과 실패 격리, DACON·Devpost·itch 일부 상세 확인 실패 표시.
- 24시간·7일·30일 안에 마감 또는 시작하는 대회 필터. 1분마다, 탭 복귀 시 만료 상태 갱신.
- 캘린더 알림 없음·1시간·1일·3일 전 선택. 신청 마감과 실제 대회 기간을 별도 일정으로 내보내기. 시작 기준 대회의 중복 일정 방지.
- 관심 대회와 주최기관 JSON 백업 및 검증 후 합치기. 자동 클라우드 동기화는 제공하지 않습니다.
- 한국 날짜 기준 D-day. 당일 마감이 D-1로 표시되는 문제 수정.
- 최신 대회가 검색엔진용 상세 주소에서 404가 되던 문제 수정. Worker 사이트맵·메타데이터도 최신 검증 데이터 사용.
- 해외 참가 규정의 지역 제한 검사와 CTF 온라인 여부의 명시적 검증 강화.
- 잘못된 원격 상세 필드, 저장소 접근 제한, 개발 화면과 CSP 충돌에 대한 처리.
- 호환 범위 내 의존성 보안 패치. 확인 시점 npm audit 보고 0건은 알려진 패키지 취약점 결과이며 전체 보안 보증은 아닙니다.

### 우선순위가 높은 후속 작업

1. 국내 수동 출처의 정기 검토와 실패한 공식 공고 주소 갱신. 확인 가능한 공식 공고가 생기는 대로 추가.
2. 날짜만 발표하고 시각은 공개하지 않은 국내 대회를 정확도 손실 없이 표현하는 데이터 모델. 임의로 23:59를 넣어 게시하지 않음.
3. 요청 제한을 받는 출처의 요청량·재시도 정책 개선과 대학 대회 공식 공지의 구조별 파서 확대.
4. 실제 캘린더 앱별 알림 호환성 피드백, Discord 마감 알림의 수요 검증과 운영 방식 설계.
5. 실제 사용 사례와 외부 기여를 확보. 기능 수나 자동 생성 커밋 수를 사용자 수·외부 기여의 대리 지표로 사용하지 않음.

## 제출 전

영문 세 답변은 각각 500자 이내입니다. 신청서의 현재 항목과 맞는지 확인하고 본인 계정 정보를 직접 입력하세요. CodePes는 아직 초기 프로젝트이므로 선정은 보장되지 않습니다. 심사 대상의 사용성·생태계 중요성·활발한 유지보수에 관한 판단은 OpenAI가 합니다. 신청서는 수시 검토하며 선정 시 이메일로 안내한다는 공식 안내를 확인했습니다. 이 문서에 Brawl Status KR 신청 내용을 그대로 재사용하지 않았으며, 어떤 신청서도 대신 전송하지 않았습니다.

