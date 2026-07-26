import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  deduplicate,
  toIso,
  validateContests,
} from "./lib/contest-utils.mjs";

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
    headers: { "User-Agent": "CodePes/0.1 (+competition directory)" },
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
  const codeforcesSource = sources.find(
    (source) =>
      source.id === "codeforces" &&
      source.enabled === true &&
      source.autoPublish === true,
  );

  validateContests(manual);
  let apiContests = [];

  if (codeforcesSource) {
    try {
      const fetched = await fetchCodeforces(codeforcesSource, verifiedAt);
      apiContests = preserveUnchangedVerificationTimes(
        fetched,
        previous.contests,
      );
      console.log(`Codeforces: 예정 대회 ${apiContests.length}개 수집`);
    } catch (error) {
      apiContests = previous.contests.filter(
        (contest) =>
          contest.sourceName === "Codeforces 공식 API" &&
          new Date(contest.applicationDeadline).getTime() > Date.now(),
      ).map((contest) => ({ ...contest, deadlineKind: "start" }));
      console.warn(
        `Codeforces 수집 실패, 기존 데이터 ${apiContests.length}개 유지:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  const contests = deduplicate(
    [...manual, ...apiContests],
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
