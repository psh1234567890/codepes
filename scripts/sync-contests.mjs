import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  deduplicate,
  toIso,
  validateContests,
} from "./lib/contest-utils.mjs";
import {
  extractKitpaContestDetailUrl,
  extractKoiGuideLinks,
  normalizeAtCoderHtml,
  normalizeCodeChefPayload,
  normalizeCtftimePayload,
  normalizeDevpostHackathon,
  normalizeItchJamsHtml,
  normalizeKitpaYouthContestHtml,
  normalizeKoiGuideHtml,
  normalizeKookminAlgorithmHtml,
} from "./lib/source-adapters.mjs";

const USER_AGENT = "CodePes/0.1 (+competition directory)";
const KOREAN_ONLINE_TAG = "한국 온라인 참가 가능";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manualPath = path.join(root, "data", "manual-contests.json");
const sourcesPath = path.join(root, "data", "sources.json");
const outputPath = path.join(
  root,
  "src",
  "data",
  "competitions.generated.json",
);

const readJson = async (filePath) =>
  JSON.parse(await readFile(filePath, "utf8"));

const normalizeCodeforces = (contest, verifiedAt) => {
  const start = contest.startTimeSeconds;
  const end = start + contest.durationSeconds;

  return {
    id: `codeforces-${contest.id}`,
    title: contest.name,
    summary: `${contest.type} 형식의 온라인 알고리즘 대회로, 별도 사전 신청 없이 시작 시각부터 참가할 수 있습니다.`,
    type: "ps",
    organizer: "Codeforces",
    eligibilities: ["anyone"],
    eligibilityNote: "Codeforces 계정이 있는 누구나",
    mode: "online",
    applicationDeadline: toIso(start),
    deadlineKind: "start",
    eventStart: toIso(start),
    eventEnd: toIso(end),
    location: "온라인",
    teamSize: "개인",
    languages: ["C++", "Java", "Python", "Kotlin"],
    tags: ["PS", "알고리즘", contest.type],
    url: `https://codeforces.com/contest/${contest.id}`,
    sourceName: "Codeforces 공식 API",
    sourceType: "official-api",
    lastVerifiedAt: verifiedAt,
  };
};

const fetchCodeforces = async (source, verifiedAt) => {
  const response = await fetch(source.endpoint, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Codeforces API HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (payload.status !== "OK" || !Array.isArray(payload.result)) {
    throw new Error(payload.comment ?? "Codeforces API 응답 형식이 다릅니다.");
  }

  const nowSeconds = Date.now() / 1000;
  const horizonSeconds = nowSeconds + 180 * 24 * 60 * 60;

  return payload.result
    .filter(
      (contest) =>
        contest.phase === "BEFORE" &&
        contest.startTimeSeconds > nowSeconds &&
        contest.startTimeSeconds <= horizonSeconds,
    )
    .map((contest) => normalizeCodeforces(contest, verifiedAt));
};

const fetchAtCoder = async (source, verifiedAt) => {
  const response = await fetch(source.endpoint, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`AtCoder 공식 페이지 HTTP ${response.status}`);
  }
  return normalizeAtCoderHtml(await response.text(), verifiedAt);
};

const fetchCodeChef = async (source, verifiedAt) => {
  const response = await fetch(source.endpoint, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`CodeChef API HTTP ${response.status}`);
  }
  return normalizeCodeChefPayload(await response.json(), verifiedAt);
};

const fetchCtftime = async (source, verifiedAt) => {
  const start = Math.floor(Date.now() / 1000);
  const finish = start + 120 * 24 * 60 * 60;
  const endpoint = new URL(source.endpoint);
  endpoint.searchParams.set("limit", "100");
  endpoint.searchParams.set("start", String(start));
  endpoint.searchParams.set("finish", String(finish));
  const response = await fetch(endpoint, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`CTFtime API HTTP ${response.status}`);
  }
  return normalizeCtftimePayload(await response.json(), verifiedAt);
};

const fetchItchJams = async (source, verifiedAt) => {
  const response = await fetch(source.endpoint, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`itch.io 게임잼 페이지 HTTP ${response.status}`);
  }
  return normalizeItchJamsHtml(await response.text(), verifiedAt);
};

const fetchOfficialHtml = async (url, label) => {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`${label} HTTP ${response.status}`);
  }
  return response.text();
};

const fetchKoi = async (source, verifiedAt) => {
  const homeHtml = await fetchOfficialHtml(
    source.endpoint,
    "한국정보올림피아드 공식 페이지",
  );
  const guideUrls = extractKoiGuideLinks(homeHtml);
  if (guideUrls.length === 0) {
    throw new Error("한국정보올림피아드 공식 회차 안내 링크를 찾지 못했습니다.");
  }

  const contests = await Promise.all(
    guideUrls.map(async (guideUrl) =>
      normalizeKoiGuideHtml(
        await fetchOfficialHtml(guideUrl, "한국정보올림피아드 회차 안내"),
        guideUrl,
        verifiedAt,
      ),
    ),
  );
  return contests.filter(Boolean);
};

const fetchKitpaYouth = async (source, verifiedAt) => {
  const indexHtml = await fetchOfficialHtml(
    source.endpoint,
    "한국정보기술진흥원 경시대회 목록",
  );
  const detailUrl = extractKitpaContestDetailUrl(indexHtml);
  if (!detailUrl) {
    throw new Error("한국정보기술진흥원 최신 경시대회 안내를 찾지 못했습니다.");
  }

  const detailHtml = await fetchOfficialHtml(
    detailUrl,
    "한국정보기술진흥원 경시대회 안내",
  );
  const contest = normalizeKitpaYouthContestHtml(
    detailHtml,
    detailUrl,
    verifiedAt,
  );
  return contest ? [contest] : [];
};

const fetchKookminAlgorithm = async (source, verifiedAt) => {
  const html = await fetchOfficialHtml(
    source.endpoint,
    "국민대학교 알고리즘대회 안내",
  );
  const contest = normalizeKookminAlgorithmHtml(
    html,
    source.endpoint,
    verifiedAt,
  );
  return contest ? [contest] : [];
};

const fetchDevpostSchedule = async (hackathon) => {
  const scheduleUrl = new URL("/details/dates", hackathon.url);
  const response = await fetch(scheduleUrl, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`Devpost 일정 HTTP ${response.status}`);
  }
  return response.text();
};

const fetchDevpostRules = async (hackathon) => {
  const rulesUrl = new URL("/rules", hackathon.url);
  const response = await fetch(rulesUrl, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`Devpost 규정 HTTP ${response.status}`);
  }
  return response.text();
};

const fetchDevpost = async (source, verifiedAt, previousContests) => {
  const response = await fetch(source.endpoint, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`Devpost 목록 HTTP ${response.status}`);
  }
  const payload = await response.json();
  if (!payload || !Array.isArray(payload.hackathons)) {
    throw new Error("Devpost 목록 응답 형식이 다릅니다.");
  }

  const previousById = new Map(
    previousContests.map((contest) => [contest.id, contest]),
  );
  const contests = [];
  const batchSize = 5;

  for (let index = 0; index < payload.hackathons.length; index += batchSize) {
    const batch = payload.hackathons.slice(index, index + batchSize);
    const results = await Promise.all(
      batch.map(async (hackathon) => {
        const id = `devpost-${hackathon.id}`;
        try {
          const [scheduleHtml, rulesHtml] = await Promise.all([
            fetchDevpostSchedule(hackathon),
            fetchDevpostRules(hackathon),
          ]);
          return normalizeDevpostHackathon(
            hackathon,
            scheduleHtml,
            rulesHtml,
            verifiedAt,
          );
        } catch (error) {
          const previous = previousById.get(id);
          if (
            previous &&
            Date.parse(previous.applicationDeadline) > Date.now() &&
            previous.tags.includes(KOREAN_ONLINE_TAG)
          ) {
            console.warn(
              `Devpost 일정 확인 실패, 기존 항목 유지 (${id}):`,
              error instanceof Error ? error.message : error,
            );
            return previous;
          }
          console.warn(
            `Devpost 일정 확인 실패, 항목 제외 (${id}):`,
            error instanceof Error ? error.message : error,
          );
          return undefined;
        }
      }),
    );
    contests.push(...results.filter(Boolean));
  }

  return contests;
};

const withoutVerificationTime = ({ lastVerifiedAt: _ignored, ...contest }) =>
  contest;

const preserveUnchangedVerificationTimes = (contests, previousContests) => {
  const previousById = new Map(
    previousContests.map((contest) => [contest.id, contest]),
  );

  return contests.map((contest) => {
    const previous = previousById.get(contest.id);
    if (
      previous &&
      JSON.stringify(withoutVerificationTime(previous)) ===
        JSON.stringify(withoutVerificationTime(contest))
    ) {
      return { ...contest, lastVerifiedAt: previous.lastVerifiedAt };
    }
    return contest;
  });
};

const retainPreviousSource = (previousContests, sourceName) =>
  previousContests.filter(
    (contest) =>
      contest.sourceName === sourceName &&
      Date.parse(contest.applicationDeadline) > Date.now() &&
      (!["Devpost 공식 목록·일정", "CTFtime 공식 API"].includes(sourceName) ||
        contest.tags.includes(KOREAN_ONLINE_TAG)),
  );

const collectSource = async ({
  source,
  label,
  sourceName,
  previousContests,
  fetcher,
}) => {
  if (!source?.enabled || !source.autoPublish) return [];
  try {
    const fetched = await fetcher(source);
    const contests = preserveUnchangedVerificationTimes(
      fetched,
      previousContests,
    );
    console.log(`${label}: 예정 대회 ${contests.length}개 수집`);
    return contests;
  } catch (error) {
    const previous = retainPreviousSource(previousContests, sourceName);
    console.warn(
      `${label} 수집 실패, 기존 데이터 ${previous.length}개 유지:`,
      error instanceof Error ? error.message : error,
    );
    return previous;
  }
};

const main = async () => {
  const verifiedAt = new Date().toISOString();
  const [manual, sources, previousText] = await Promise.all([
    readJson(manualPath),
    readJson(sourcesPath),
    readFile(outputPath, "utf8").catch(() => ""),
  ]);
  const previous = previousText
    ? JSON.parse(previousText)
    : { updatedAt: verifiedAt, contests: [] };
  const sourceById = new Map(sources.map((source) => [source.id, source]));

  validateContests(manual);
  const automaticGroups = await Promise.all([
    collectSource({
      source: sourceById.get("codeforces"),
      label: "Codeforces",
      sourceName: "Codeforces 공식 API",
      previousContests: previous.contests,
      fetcher: (source) => fetchCodeforces(source, verifiedAt),
    }),
    collectSource({
      source: sourceById.get("atcoder"),
      label: "AtCoder",
      sourceName: "AtCoder 공식 대회 목록",
      previousContests: previous.contests,
      fetcher: (source) => fetchAtCoder(source, verifiedAt),
    }),
    collectSource({
      source: sourceById.get("codechef"),
      label: "CodeChef",
      sourceName: "CodeChef 공식 API",
      previousContests: previous.contests,
      fetcher: (source) => fetchCodeChef(source, verifiedAt),
    }),
    collectSource({
      source: sourceById.get("devpost"),
      label: "Devpost",
      sourceName: "Devpost 공식 목록·일정",
      previousContests: previous.contests,
      fetcher: (source) =>
        fetchDevpost(source, verifiedAt, previous.contests),
    }),
    collectSource({
      source: sourceById.get("ctftime"),
      label: "CTFtime",
      sourceName: "CTFtime 공식 API",
      previousContests: previous.contests,
      fetcher: (source) => fetchCtftime(source, verifiedAt),
    }),
    collectSource({
      source: sourceById.get("koi"),
      label: "한국정보올림피아드",
      sourceName: "한국정보올림피아드 공식 안내",
      previousContests: previous.contests,
      fetcher: (source) => fetchKoi(source, verifiedAt),
    }),
    collectSource({
      source: sourceById.get("kitpa-youth"),
      label: "한국정보기술진흥원 청소년 IT경시대회",
      sourceName: "한국정보기술진흥원 공식 경시대회",
      previousContests: previous.contests,
      fetcher: (source) => fetchKitpaYouth(source, verifiedAt),
    }),
    collectSource({
      source: sourceById.get("kookmin-algorithm"),
      label: "국민대학교 알고리즘대회",
      sourceName: "국민대학교 공식 알고리즘대회",
      previousContests: previous.contests,
      fetcher: (source) => fetchKookminAlgorithm(source, verifiedAt),
    }),
    collectSource({
      source: sourceById.get("itch"),
      label: "itch.io",
      sourceName: "itch.io 공식 게임잼 목록",
      previousContests: previous.contests,
      fetcher: (source) => fetchItchJams(source, verifiedAt),
    }),
  ]);
  const automaticContests = automaticGroups.flat();

  const contests = deduplicate(
    [...manual, ...automaticContests],
    ({ contest, reason }) =>
      console.warn(`중복 제외 (${reason}): ${contest.id}`),
  ).filter(
    (contest) =>
      new Date(contest.applicationDeadline).getTime() > Date.now(),
  );
  validateContests(contests);

  const contestsChanged =
    JSON.stringify(contests) !== JSON.stringify(previous.contests);
  const next = {
    updatedAt: contestsChanged ? verifiedAt : previous.updatedAt,
    contests,
  };
  const nextText = `${JSON.stringify(next, null, 2)}\n`;

  if (nextText === previousText) {
    console.log(`변경 없음: ${contests.length}개 대회 유지`);
    return;
  }

  await writeFile(outputPath, nextText, "utf8");
  console.log(`총 ${contests.length}개 대회를 ${outputPath}에 저장`);
};

await main();
