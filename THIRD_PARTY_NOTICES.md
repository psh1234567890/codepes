# Third-Party Notices

CodePes는 다음과 같은 오픈소스 패키지를 직접 사용합니다. 정확한 버전은 `package-lock.json`이 기준이며, 각 패키지의 저작권 고지와 라이선스 전문은 배포된 패키지 또는 연결된 원본 저장소에서 확인할 수 있습니다.

## 런타임

| 패키지 | 라이선스 | 프로젝트 |
| --- | --- | --- |
| React, React DOM | MIT | <https://react.dev/> |
| Lucide React | ISC | <https://lucide.dev/> |

## 개발과 빌드

| 패키지 | 라이선스 | 프로젝트 |
| --- | --- | --- |
| Vite | MIT | <https://vite.dev/> |
| Vitest | MIT | <https://vitest.dev/> |
| TypeScript | Apache-2.0 | <https://www.typescriptlang.org/> |
| `@vitejs/plugin-react` | MIT | <https://github.com/vitejs/vite-plugin-react> |
| `@cloudflare/vite-plugin` | MIT | <https://github.com/cloudflare/workers-sdk> |
| React type definitions from DefinitelyTyped | MIT | <https://github.com/DefinitelyTyped/DefinitelyTyped> |

간접 의존성도 각자의 라이선스에 따라 배포됩니다. 전체 의존성 그래프는 다음 명령으로 확인할 수 있습니다.

```bash
npm ls --all
```

이 문서는 편의를 위한 요약이며 각 패키지에 포함된 원본 라이선스 고지를 대체하지 않습니다. CodePes 자체 소스 코드에는 저장소 루트의 [MIT License](LICENSE)가 적용됩니다.

## 대회 데이터와 상표

CodePes의 MIT License는 외부 기관이 작성한 대회 공지, 로고, 상표 또는
원문 페이지에 적용되지 않습니다.

- Codeforces 대회 메타데이터는 [공식 API](https://codeforces.com/apiHelp)에서
  확인하며 Codeforces 명칭과 데이터의 권리는 해당 권리자에게 있습니다.
- DACON 대회 정보는 [DACON 공식 대회 목록](https://dacon.io/competitions)을,
  DAKER 정보는 [DAKER 공식 해커톤 목록](https://daker.ai/public/hackathons)을
  사람이 검수해 요약합니다.
- CodePes는 위 서비스와 제휴하거나 이들의 승인을 받은 프로젝트가 아닙니다.
  참가 조건과 일정의 최종 기준은 항상 연결된 공식 원문입니다.

`public/og.png`를 포함해 저장소에서 CodePes를 위해 제작한 프로젝트 자산은
별도 고지가 없는 한 루트의 MIT License에 포함됩니다.
