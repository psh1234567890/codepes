# 국내 대회 수집 확장 기록 — 2026-09-06

## 실제 추가된 접수 중 대회

아래 세 대회는 DACON 공식 홈에서 발견하고 개요·일정·규칙을 확인했습니다. 신청 마감은 모두 **2026-09-29 10:00 KST**, 대회 기간은 **2026-08-26 10:00 ~ 2026-09-30 10:00 KST**입니다. 일반적인 대회 종료 카운트다운을 신청 마감으로 복사하지 않았습니다.

- [딥보이스 범죄 대응을 위한 AI 탐지 모델 경진대회](https://www.dacon.io/competitions/official/236749/overview/description) · [공식 일정](https://www.dacon.io/competitions/official/236749/overview/schedule)
- [블랙박스 영상 기반 지능형 고의사고 분석 모델 AI 경진대회](https://www.dacon.io/competitions/official/236753/overview/description) · [공식 일정](https://www.dacon.io/competitions/official/236753/overview/schedule)
- [나라장터 자체입찰 공고 법령 위반사항 모니터링 AI 경진대회](https://www.dacon.io/competitions/official/236754/overview/description) · [공식 일정](https://www.dacon.io/competitions/official/236754/overview/schedule)

대한민국 국민 누구나 참가하는 온라인 코드 제출 대회입니다. 원문에는 시상식 등 별도 후속 일정도 있으므로 수상·제출 규정은 원문을 확인해야 합니다.

딥보이스·블랙박스 일정표의 대회 기간 종료 연도에는 `2025년`이라는 역전이 있었으나, 별도 `대회 종료` 항목에는 `2026년 09월 30일 10:00`이 명시되어 있어 그 값을 사용했습니다. 임의로 연도를 추정한 것은 아닙니다.

## 앞으로도 발견되는 방식

`scripts/lib/dacon-source.mjs`가 공식 홈의 최대 20개 대회 후보를 읽습니다. 먼저 신청 일정으로 만료된 대회를 제외하고, 개요와 규칙을 확인해 지원하는 공개 참가·온라인 코드 제출 형식만 게시합니다. 기존 6시간 주기 동기화에 연결했으며 공개 HTML만 사용합니다.

국내 AI 확장으로 전체 목록 56개에서 59개로 증가했고 AI·데이터 분류는 7개에서 10개가 되었습니다. 마지막 14:41 KST 갱신에서는 기존 itch.io 수집기가 [Jern Jam 2026](https://itch.io/jam/jern-jam-2026)의 공개 온라인 참가 조건도 확인해 총 60개가 되었습니다. 이 수치는 이 시점의 게시 대회 수이며 이용자 수가 아닙니다. 수집 후의 취소·규정 변경과 홈에 없는 공고는 놓칠 수 있습니다.

## 발견했지만 즉시 게시하지 않은 후보

- [2026 금융 AI Challenge](https://daker.ai/public/hackathons/2026-finance-ai-challenge): 신청 기간과 기획서·MVP 제출 기간을 별도로 안내합니다. 신청 날짜만 있는 부분과 제출 마감 시각을 혼동하지 않도록 추가 검토 대상으로 남겼습니다.
- [마약류 문제 예방과 피해 감소 아이디어 챌린지](https://daker.ai/public/hackathons/csafcas): 참가 신청·팀 빌딩은 9월 14일까지, 기획서 제출은 9월 28일 오전 10시까지로 서로 다릅니다. 현재 데이터 형식은 시각 없는 신청 마감을 지원하지 않습니다.
- [2026 K-Health 미개방 데이터 활용 경진대회](https://daker.ai/public/hackathons/2026-k-health-unreleased-data-utilization-competit): 대회는 진행 중이어도 신규 신청은 8월 14일 16시에 종료되어 제외했습니다.
- [ICPC Korea](https://icpckorea.org/): 2026 예선·본선 개최일은 있지만 신규 신청에 필요한 정확한 공고를 자동 게시할 수 있는 상태는 아니므로 감시를 유지합니다.

날짜만 공개된 공고를 숨기지 않고 `마감 시각 미공개`로 표시하는 데이터 모델, DAKER의 안정적 공식 데이터 제공 방식, 대학별 공지 파서가 다음 확장 후보입니다. 모두 현재 구현됐다는 의미는 아닙니다.
