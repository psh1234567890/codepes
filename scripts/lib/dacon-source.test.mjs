import { describe, expect, it } from "vitest";
import { collectDaconContests, extractDaconUrls, normalizeDaconContest, parseDaconSchedule } from "./dacon-source.mjs";

const verifiedAt = "2026-09-06T05:00:00.000Z";
const now = Date.parse(verifiedAt);
const url = "https://www.dacon.io/competitions/official/236749/overview/description";
// Minimal public-template fixtures, not a copy of a full third-party page.
const scheduleHtml = `<p>참가 기간 : 2026년 08월 18일(화) 10:00 ~ 2026년 09월 29일(화) 10:00</p>
<p>대회 기간 : 2026년 08월 26일(수) 10:00 ~ 2026년 09월 30일(수) 10:00</p>
<p>대회 종료 : 2026년 09월 30일(수) 10:00</p>`;
const descriptionHtml = `<h1>샘플 AI 대회</h1><h3>[코드 제출 대회]</h3><p>submit.zip 업로드 방식</p>
<h3>[참가 자격]</h3><p>대한민국 국민 누구나</p><h3>[주최 / 운영]</h3><p>주최: 예시기관, 예시연구원</p><p>운영: 데이콘</p>`;
const rulesHtml = "<p>개인 또는 팀 참여</p><p>팀 최대 인원 : 5 명</p><p>사용 가능 언어: Python</p>";
const input = { url, descriptionHtml, scheduleHtml, rulesHtml, verifiedAt, now };

describe("DACON official discovery", () => {
  it("deduplicates fixed-origin official links and ignores hidden or practice links", () => {
    expect(extractDaconUrls(`<a href="${url}">대회</a><a href="/competitions/official/236749/overview/description">중복</a>
      <a href="https://evil.example/competitions/official/123/overview/description">외부</a>
      <a href="/competitions/practice/123/overview/description">연습</a>
      <script><a href="/competitions/official/456/overview/description">숨김</a></script>`)).toEqual([url]);
    expect(() => extractDaconUrls("<h1>점검 중</h1>")).toThrow();
  });

  it("distinguishes registration deadline, contest start and contest end", () => {
    expect(normalizeDaconContest(input)).toMatchObject({
      id: "dacon-236749", type: "ai-data", deadlineKind: "application", mode: "online",
      applicationDeadline: "2026-09-29T01:00:00.000Z", eventStart: "2026-08-26T01:00:00.000Z",
      eventEnd: "2026-09-30T01:00:00.000Z", teamSize: "개인 또는 최대 5인", languages: ["Python"],
    });
  });

  it("uses an explicit end when the range has an impossible previous-year typo", () => {
    const typo = scheduleHtml.replace("~ 2026년 09월 30일", "~ 2025년 09월 30일");
    expect(parseDaconSchedule(typo, now)?.eventEnd).toBe("2026-09-30T01:00:00.000Z");
    expect(parseDaconSchedule(typo.replace(/<p>대회 종료[^<]+<\/p>/, ""), now)).toBeUndefined();
  });

  it("rejects conflicting plausible end dates", () => {
    expect(parseDaconSchedule(scheduleHtml.replace("대회 종료 : 2026년 09월 30일", "대회 종료 : 2026년 10월 01일"), now)).toBeUndefined();
  });

  it.each([
    scheduleHtml.replace("2026년 09월 29일(화) 10:00", "2026년 09월 29일(화)"),
    scheduleHtml.replace("2026년 09월 29일(화) 10:00", "2026년 09월 31일(화) 10:00"),
    scheduleHtml.replace("2026년 09월 29일(화) 10:00", "2026년 09월 29일(화) 25:00"),
    scheduleHtml.replace("2026년 09월 29일(화) 10:00", "2026년 08월 29일(화) 10:00"),
  ])("does not invent missing times or accept invalid/expired registration dates", (html) => {
    expect(parseDaconSchedule(html, now)).toBeUndefined();
  });

  it.each([
    { descriptionHtml: descriptionHtml.replace("대한민국 국민 누구나", "예시대학교 재학생만") },
    { descriptionHtml: descriptionHtml.replace("대한민국 국민 누구나", "대한민국 국민 누구나 (선발자에 한함)") },
    { descriptionHtml: descriptionHtml.replace("submit.zip 업로드", "현장 참가") },
    { rulesHtml: rulesHtml + " 오프라인 본선 필수" },
    { url: url.replace("www.dacon.io", "evil.example") },
  ])("excludes unsupported participation conditions", (override) => {
    expect(normalizeDaconContest({ ...input, ...override })).toBeUndefined();
  });

  it("isolates detail failures and reports degraded status without losing valid new contests", async () => {
    const second = url.replace("236749", "236753");
    const old = { ...normalizeDaconContest(input), id: "dacon-236753", url: second, lastVerifiedAt: "2026-09-05T01:00:00.000Z" };
    const result = await collectDaconContests({
      endpoint: "https://www.dacon.io/", verifiedAt, now, previousContests: [old], warn: () => {},
      fetchHtml: async (target) => {
        if (target.endsWith("dacon.io/")) return `<a href="${url}">1</a><a href="${second}">2</a>`;
        if (target.includes("236753")) throw new Error("HTTP 503");
        return target.endsWith("schedule") ? scheduleHtml : target.endsWith("rules") ? rulesHtml : descriptionHtml;
      },
    });
    expect(result.partialFailure).toBe(true);
    expect(result.contests).toHaveLength(2);
    expect(result.contests[1].lastVerifiedAt).toBe(old.lastVerifiedAt);
  });

  it("skips expired schedules without fetching their description and rules", async () => {
    const requests = [];
    const result = await collectDaconContests({
      endpoint: "https://www.dacon.io/", verifiedAt, now, warn: () => {},
      fetchHtml: async (target) => {
        requests.push(target);
        return target.endsWith("dacon.io/") ? `<a href="${url}">대회</a>` : scheduleHtml.replaceAll("2026년", "2025년");
      },
    });
    expect(requests).toHaveLength(2);
    expect(result).toEqual({ contests: [], partialFailure: false });
  });
});
