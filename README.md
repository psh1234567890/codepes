# CodePes

PS·알고리즘 대회, 해커톤, AI·데이터 경진대회 등을 참가 자격과 진행
방식으로 빠르게 찾는 한국어 대회 디렉터리 MVP입니다.

## 실행

```powershell
npm.cmd install
npm.cmd run sync
npm.cmd run dev
```

기본 주소는 `http://127.0.0.1:4173`입니다.

## 현재 자동 수집 범위

- Codeforces: 공식 `contest.list` JSON API에서 예정 대회를 30분마다 수집하고
  바로 발행합니다.
- DACON / DAKER: 공개 대회 목록 API가 확인되지 않아 공식 페이지에서 일정과
  참가 자격을 확인한 항목만 `data/manual-contests.json`에 넣습니다.
- URL과 `정규화한 대회명 + 날짜`를 함께 비교해 중복을 제거합니다.
- 수집이 일시적으로 실패하면 마지막으로 정상 수집된 예정 대회를 유지합니다.

GitHub 저장소에서는 `.github/workflows/sync-contests.yml`이 30분마다 데이터를
새로 만들고, 변경분이 있을 때만 커밋합니다.

## 운영 확장 권장안

1. 공식 API/RSS는 자동 발행
2. 공개 API가 없는 출처는 후보 수집 후 검수 대기열로 이동
3. 사용자 제보 URL도 같은 대기열에서 중복 검사
4. 운영 단계에서는 JSON 대신 Supabase 같은 DB에 `sources`, `contests`,
   `ingestion_runs`, `review_queue` 테이블로 분리
5. 마감일이 바뀌거나 원문이 사라진 대회는 자동으로 재검수 표시

웹사이트의 제보·구독 양식은 현재 브라우저 안에서 성공 상태까지 보여주는 MVP
동작입니다. 실제 이메일 발송과 계정 동기화는 백엔드를 연결한 다음 활성화합니다.
