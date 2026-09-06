import { stripVisibleHtml } from "./source-adapters.mjs";
import { validateContests } from "./contest-utils.mjs";

const SOURCE_NAME = "DACON 공식 페이지";
const DATE = String.raw`(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*(?:\([^)]*\))?\s*(\d{1,2}):(\d{2})`;
const visible = (html) => stripVisibleHtml(html).replace(/\s+/g, " ");

// Never infer midnight or 23:59 for a date-only announcement.
const parseDate = (parts) => {
  if (!parts) return undefined;
  const [year, month, day, hour, minute] = parts.map(Number);
  if (month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59) return undefined;
  const timestamp = Date.UTC(year, month - 1, day, hour - 9, minute);
  const korean = new Date(timestamp + 9 * 60 * 60 * 1000);
  if (korean.getUTCFullYear() !== year || korean.getUTCMonth() !== month - 1 || korean.getUTCDate() !== day) return undefined;
  return new Date(timestamp).toISOString();
};

export const extractDaconUrls = (html) => {
  const urls = new Set();
  const page = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  for (const match of page.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)) {
    const url = new URL(match[1], "https://www.dacon.io/");
    if (url.protocol !== "https:" || !["dacon.io", "www.dacon.io"].includes(url.hostname)) continue;
    if (!/^\/competitions\/official\/\d+\/overview\/description\/?$/.test(url.pathname)) continue;
    urls.add(`https://www.dacon.io${url.pathname.replace(/\/$/, "")}`);
  }
  if (!urls.size) throw new Error("DACON 공식 대회 링크를 찾지 못했습니다.");
  return [...urls].slice(0, 20);
};

export const parseDaconSchedule = (html, now = Date.now()) => {
  const text = visible(html);
  const registration = text.match(new RegExp(`(?:참가|신청) 기간\\s*:\\s*${DATE}\\s*~\\s*${DATE}`));
  const period = text.match(new RegExp(`대회 기간\\s*:\\s*${DATE}\\s*~\\s*${DATE}`));
  const explicitEnd = text.match(new RegExp(`대회 종료\\s*:\\s*${DATE}`));
  if (!registration || !period) return undefined;
  const registrationStart = parseDate(registration.slice(1, 6));
  const applicationDeadline = parseDate(registration.slice(6, 11));
  const eventStart = parseDate(period.slice(1, 6));
  const rangeEnd = parseDate(period.slice(6, 11));
  const statedEnd = parseDate(explicitEnd?.slice(1, 6));
  // Some official ranges have an impossible previous-year end. Use the
  // separately stated exact end, never a guessed correction to that year.
  const eventEnd = statedEnd ?? rangeEnd;
  if (!registrationStart || !applicationDeadline || !eventStart || !eventEnd) return undefined;
  if (rangeEnd && statedEnd && rangeEnd !== statedEnd && Date.parse(rangeEnd) >= Date.parse(eventStart)) return undefined;
  if (Date.parse(registrationStart) > Date.parse(applicationDeadline) || Date.parse(eventStart) >= Date.parse(eventEnd)) return undefined;
  const deadline = Date.parse(applicationDeadline);
  if (deadline <= now || deadline > now + 180 * 86400000 || deadline > Date.parse(eventEnd)) return undefined;
  return { applicationDeadline, deadlineKind: "application", eventStart, eventEnd };
};

export const normalizeDaconContest = ({ url, descriptionHtml, scheduleHtml, rulesHtml, verifiedAt, now = Date.now() }) => {
  const official = new URL(url);
  const id = official.pathname.match(/^\/competitions\/official\/(\d+)\/overview\/description\/?$/)?.[1];
  if (!id || official.protocol !== "https:" || !["dacon.io", "www.dacon.io"].includes(official.hostname)) return undefined;
  const schedule = parseDaconSchedule(scheduleHtml, now);
  if (!schedule) return undefined;
  const title = visible(descriptionHtml.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");
  const description = visible(descriptionHtml);
  const rules = visible(rulesHtml);
  const eligibility = description.match(/\[참가\s*자격\]\s*([^[]+)\[/)?.[1]?.trim();
  const organizer = description.match(/주최\s*:\s*(.+?)\s*(?:주관|운영)\s*:/)?.[1]?.trim();
  // This adapter covers the publicly open online-code-submission template.
  // Institution-only or ambiguous eligibility needs a separate reviewed parser.
  if (!title || !organizer || !/^대한민국\s*국민\s*누구나[.!]?$/.test(eligibility ?? "")) return undefined;
  if (!/코드 제출 대회/.test(description) || !/submit\.zip.*업로드/.test(description)) return undefined;
  if (!/개인 또는 팀/.test(rules) || /(?:오프라인|현장|대면)\s*(?:본선|발표|평가)/.test(`${description} ${rules}`)) return undefined;
  const teamLimit = rules.match(/팀 최대 인원\s*:\s*(\d+)\s*명/)?.[1];
  const contest = {
    id: `dacon-${id}`,
    title,
    summary: "국내 참가자를 위한 AI 모델 개발 대회입니다. 온라인 코드 제출로 평가하며, 신청 마감과 대회 종료 일정이 다릅니다.",
    type: "ai-data",
    organizer: organizer.replace(/,\s*/g, " · "),
    eligibilities: ["anyone"],
    eligibilityNote: "대한민국 국민 누구나. 세부 참가·수상 조건과 후속 평가 자료는 공식 규정 확인.",
    mode: "online",
    ...schedule,
    location: "온라인 코드 제출 · 시상식 등 후속 일정은 공식 안내 확인",
    teamSize: teamLimit ? `개인 또는 최대 ${teamLimit}인` : "개인 또는 팀 (공식 규정 확인)",
    ...(/사용 가능 언어\s*:\s*Python\b/.test(rules) ? { languages: ["Python"] } : {}),
    tags: ["AI", "국내 대회", "코드 제출", "DACON"],
    url: `https://www.dacon.io/competitions/official/${id}/overview/description`,
    sourceName: SOURCE_NAME,
    sourceType: "official-page",
    lastVerifiedAt: verifiedAt,
  };
  validateContests([contest]);
  return contest;
};

export const collectDaconContests = async ({ endpoint, fetchHtml, verifiedAt, previousContests = [], now = Date.now(), warn = console.warn }) => {
  const urls = extractDaconUrls(await fetchHtml(endpoint, "DACON 공식 대회 목록"));
  const contests = [];
  let partialFailure = false;
  // Bound concurrency and request count; expired schedules need no further fetches.
  for (let offset = 0; offset < urls.length; offset += 3) {
    const batch = await Promise.all(urls.slice(offset, offset + 3).map(async (url) => {
      try {
        const scheduleHtml = await fetchHtml(url.replace(/description$/, "schedule"), "DACON 공식 일정");
        if (!parseDaconSchedule(scheduleHtml, now)) return undefined;
        const [descriptionHtml, rulesHtml] = await Promise.all([
          fetchHtml(url, "DACON 공식 개요"),
          fetchHtml(url.replace(/description$/, "rules"), "DACON 공식 규칙"),
        ]);
        return normalizeDaconContest({ url, descriptionHtml, scheduleHtml, rulesHtml, verifiedAt, now });
      } catch (error) {
        partialFailure = true;
        warn(`DACON 상세 확인 실패 (${url}): ${error instanceof Error ? error.message : error}`);
        const id = `dacon-${url.match(/official\/(\d+)/)[1]}`;
        return previousContests.find((contest) => contest.id === id && contest.sourceName === SOURCE_NAME && Date.parse(contest.applicationDeadline) > now);
      }
    }));
    contests.push(...batch.filter(Boolean));
  }
  return { contests, partialFailure };
};
