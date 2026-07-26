# CodePes

CodePes는 알고리즘, 해커톤, AI·데이터, 게임, 보안 분야의 개발 대회를 한곳에서 찾고 일정으로 관리할 수 있는 오픈소스 웹 애플리케이션입니다. 대회 정보의 최종 기준은 항상 주최 기관의 공식 페이지입니다.

## 주요 기능

- 제목, 주최 기관, 태그를 대상으로 한 실시간 검색
- 대회 유형, 참가 자격, 진행 방식, 마감순·최근 확인순 필터
- 브라우저 `localStorage`에 저장되는 관심 대회
- 저장한 대회만 모아 보기
- 전체 일정, 저장한 일정, 개별 일정을 표준 `.ics` 파일로 내보내기
- 선택한 대회의 공유 링크 생성
- 공식 대회 페이지로 바로 이동
- 잘못된 정보와 신규 대회를 공개 GitHub 이슈로 제보
- GitHub의 최신 대회 JSON을 우선 사용하고, 네트워크 또는 검증 실패 시 배포 번들 데이터로 자동 복구

CodePes에는 계정, 로그인, 이메일 구독, 자체 데이터베이스가 없습니다. 관심 대회는 현재 사용 중인 브라우저에만 저장되며 다른 기기와 동기화되지 않습니다.

## 라이브 서비스

**[CodePes 바로 열기](https://codepes-korea-contests.seunghunbag76.chatgpt.site)**

공개 프로덕션 서비스는 GitHub `main` 브랜치에서 검증된 소스와 같은 커밋을 기준으로 배포합니다.

## 빠른 시작

요구 사항:

- Node.js 20 이상
- npm

```bash
git clone https://github.com/psh1234567890/codepes.git
cd codepes
npm ci
npm run dev
```

Windows PowerShell에서 실행 정책 때문에 `npm.ps1`이 차단되면 `npm` 대신 `npm.cmd`를 사용하세요.

```powershell
npm.cmd ci
npm.cmd run dev
```

개발 서버의 기본 주소는 `http://127.0.0.1:4173`입니다.

## 개발 명령

| 명령 | 설명 |
| --- | --- |
| `npm ci` | 잠금 파일을 기준으로 의존성을 재현 가능하게 설치합니다. |
| `npm run dev` | Vite 개발 서버를 실행합니다. |
| `npm run sync` | 공식 API와 수동 검증 목록을 병합해 대회 JSON을 갱신합니다. 네트워크 연결이 필요합니다. |
| `npm run typecheck` | 애플리케이션, 도구, Worker의 TypeScript 타입을 검사합니다. |
| `npm run test` | Vitest 단위 테스트를 한 번 실행합니다. |
| `npm run build` | 타입 검사 후 프로덕션 번들을 생성합니다. |
| `npm run verify` | 타입 검사, 테스트, 프로덕션 빌드를 순서대로 모두 실행합니다. |

변경사항을 제출하기 전에는 다음 명령이 통과해야 합니다.

```bash
npm run verify
```

## 데이터가 갱신되는 방식

Codeforces와 CodeChef의 예정 대회는 각 플랫폼의 공식 JSON 목록에서 가져오고, AtCoder는 공식 페이지의 `Upcoming Contests` 표만 읽습니다. 이 플랫폼들은 별도의 참가 신청 마감 시각을 제공하지 않으므로 일정 기준은 **대회 시작 시각**입니다. 화면과 캘린더에서도 이 차이를 구분합니다.

Devpost는 공개 해커톤 목록, 공식 일정, 공식 규정을 함께 확인합니다. 온라인 진행이면서 규정에 대한민국·전 세계·모든 국가 참가 가능 또는 제재 국가 외 참가 가능이 명시된 대회만 게시합니다. 연령과 팀 구성 같은 조건은 `대회별 확인`으로 표시합니다.

CTFtime에서는 향후 120일 안에 열리며 `Online`과 `Open`이 모두 명시된 보안 CTF만 가까운 일정순으로 최대 30개 가져옵니다. itch.io 게임잼은 국가별 참가 자격을 구조적으로 확인하기 어려워 자동 게시하지 않습니다.

국내 대회는 한국정보올림피아드, 연 2회 열리는 한국정보기술진흥원 청소년 IT경시대회, 국민대학교 알고리즘대회, UCPC의 공식 안내를 6시간마다 확인합니다. 현재 공지와 회차 상세를 함께 읽고, 접수 마감과 실제 개최 시간이 모두 공개된 접수 중 회차만 자동 게시합니다.

SCPC, ICPC Korea, 이화여자대학교 전국 여고생 프로그래밍 경진대회, 호남권 5개 대학 연합 청소년 SW프로그래밍 경진대회, Baekjoon 공식 대회 목록도 출처로 등록했습니다. 다만 정확한 마감 시각이 없거나 일정이 이미지로만 제공되거나 공식 서비스가 중단된 출처는 임의로 정보를 만들지 않고 자동 게시를 보류합니다.

DACON과 DAKER처럼 검증된 공개 목록 API가 없는 출처는 공식 페이지를 사람이 확인한 뒤 `data/manual-contests.json`에 반영합니다. 동기화 작업은 만료된 항목을 제외하고 URL과 제목·날짜를 기준으로 중복을 제거합니다.

브라우저는 시작할 때 GitHub `main` 브랜치의 최신 생성 JSON을 불러와 스키마와 갱신 시각을 확인합니다. 원격 데이터가 잘못되었거나 오래되었거나 요청에 실패하면 빌드에 포함된 데이터로 안전하게 돌아갑니다.

자세한 수집 기준과 한계는 [데이터 출처와 검증 정책](docs/DATA_SOURCES.md)을 확인하세요.

## 프로젝트 구조

```text
data/                         수동 검증 대회와 출처 설정
scripts/                      데이터 동기화·검증 도구
src/components/               React UI 구성 요소
src/data/                     생성된 배포용 대회 JSON
src/lib/                      검색, 데이터 검증, 캘린더 유틸리티
worker/                       정적 애셋을 제공하는 Worker 진입점
.github/workflows/            검증과 정기 데이터 갱신 자동화
```

전체 흐름은 [아키텍처 문서](docs/ARCHITECTURE.md)에 정리되어 있습니다.

## 기여하기

버그 수정, 접근성 개선, 테스트, 문서, 공식 대회 정보 제보를 환영합니다.

1. 먼저 [CONTRIBUTING.md](CONTRIBUTING.md)를 읽어 주세요.
2. 대회 정보는 반드시 주최 기관의 공식 URL과 함께 제안해 주세요.
3. 보안 문제는 공개 이슈 대신 [SECURITY.md](SECURITY.md)의 비공개 경로를 사용해 주세요.
4. 참여자는 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)를 따라야 합니다.

일반적인 사용 질문은 [SUPPORT.md](SUPPORT.md), 개인정보 처리 범위는 [PRIVACY.md](PRIVACY.md)를 참고하세요.

## 오픈소스 준비 상태

라이선스, 기여 정책, 보안 정책, 데이터 출처, 테스트 명령과 자동 갱신 절차를 저장소에 문서화했습니다. 공개 저장소·배포·릴리스·사용자 피드백 이력까지 포함한 신청 전 확인 목록은 [오픈소스 지원 프로그램 준비 문서](docs/OPEN_SOURCE_READINESS.md)에 있습니다.

## 라이선스

CodePes 소스 코드는 [MIT License](LICENSE)로 배포됩니다. 사용된 외부 패키지의 라이선스는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)를 확인하세요.
