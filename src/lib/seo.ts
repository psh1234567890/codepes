import { MODE_LABELS } from "./competition";
import type { Competition } from "../types/competition";

export const SITE_URL = "https://codepes.kro.kr";
export const DEFAULT_PAGE_TITLE =
  "CodePes — 코딩 대회·알고리즘·해커톤 일정";
export const DEFAULT_PAGE_DESCRIPTION =
  "한국인이 참가 가능한 알고리즘 대회, 해커톤, AI·데이터 경진대회, 보안 CTF, 게임잼 일정을 검색하고 캘린더로 확인하세요.";

const CONTEST_PATH_PATTERN = /^\/contests\/([^/]+)\/?$/;

const truncate = (value: string, maximumLength: number) => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maximumLength) return normalized;
  return `${normalized.slice(0, maximumLength - 1).trimEnd()}…`;
};

export const getContestPath = (contestId: string) =>
  `/contests/${encodeURIComponent(contestId)}`;

export const getContestUrl = (contestId: string) =>
  `${SITE_URL}${getContestPath(contestId)}`;

export const getContestIdFromUrl = (url: URL) => {
  const pathMatch = url.pathname.match(CONTEST_PATH_PATTERN);
  if (pathMatch) {
    try {
      return decodeURIComponent(pathMatch[1]);
    } catch {
      return undefined;
    }
  }

  // Keep old shared links working while canonical URLs move to /contests/:id.
  return url.searchParams.get("contest") ?? undefined;
};

export const buildContestSeo = (competition: Competition) => {
  const description = truncate(
    `${competition.summary} ${competition.organizer} 주최, ${
      MODE_LABELS[competition.mode]
    } 대회입니다. 일정과 참가 조건을 확인하세요.`,
    160,
  );

  return {
    title: `${competition.title} 일정·참가 정보 | CodePes`,
    description,
    canonicalUrl: getContestUrl(competition.id),
  };
};

export const buildWebsiteStructuredData = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "CodePes",
  alternateName: "코드페스",
  url: `${SITE_URL}/`,
  description:
    "한국인이 참가할 수 있는 PS·알고리즘, 해커톤, AI·데이터, 보안, 게임 경진대회를 한곳에서 찾는 서비스",
  inLanguage: "ko-KR",
});

export const buildContestStructuredData = (competition: Competition) => {
  const seo = buildContestSeo(competition);
  const attendanceMode = {
    online: "https://schema.org/OnlineEventAttendanceMode",
    offline: "https://schema.org/OfflineEventAttendanceMode",
    hybrid: "https://schema.org/MixedEventAttendanceMode",
  }[competition.mode];

  return {
    "@context": "https://schema.org",
    "@graph": [
      buildWebsiteStructuredData(),
      {
        "@type": "Event",
        name: competition.title,
        description: seo.description,
        startDate: competition.eventStart,
        endDate: competition.eventEnd,
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: attendanceMode,
        location:
          competition.mode === "online"
            ? {
                "@type": "VirtualLocation",
                url: competition.url,
              }
            : {
                "@type": "Place",
                name: competition.location,
              },
        organizer: {
          "@type": "Organization",
          name: competition.organizer,
        },
        url: seo.canonicalUrl,
        sameAs: competition.url,
        inLanguage: "ko-KR",
      },
    ],
  };
};

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

export const buildSitemapXml = (
  contests: Competition[],
  updatedAt: string,
) => {
  const urls = [
    `  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${escapeXml(updatedAt)}</lastmod>
  </url>`,
    ...contests.map(
      (competition) => `  <url>
    <loc>${escapeXml(getContestUrl(competition.id))}</loc>
    <lastmod>${escapeXml(competition.lastVerifiedAt)}</lastmod>
  </url>`,
    ),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
};
