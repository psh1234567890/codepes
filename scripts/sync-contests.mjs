import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manualPath = path.join(root, "data", "manual-contests.json");
const outputPath = path.join(
  root,
  "src",
  "data",
  "competitions.generated.json",
);
const codeforcesEndpoint =
  "https://codeforces.com/api/contest.list?gym=false";

const readJson = async (filePath) =>
  JSON.parse(await readFile(filePath, "utf8"));

const normalizeTitle = (title) =>
  title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");

const canonicalUrl = (url) => {
  const parsed = new URL(url);
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "").toLowerCase();
};

const toIso = (seconds) => new Date(seconds * 1000).toISOString();

const normalizeCodeforces = (contest, verifiedAt) => {
  const start = contest.startTimeSeconds;
  const end = start + contest.durationSeconds;
  const contestUrl = `https://codeforces.com/contest/${contest.id}`;

  return {
    id: `codeforces-${contest.id}`,
    title: contest.name,
    summary: `${contest.type} 형식의 온라인 알고리즘 프로그래밍 대회`,
    type: "ps",
    organizer: "Codeforces",
    eligibilities: ["anyone"],
    eligibilityNote: "Codeforces 계정이 있는 누구나",
    mode: "online",
    applicationDeadline: toIso(start),
    eventStart: toIso(start),
    eventEnd: toIso(end),
    location: "온라인",
    teamSize: "개인",
    languages: ["C++", "Java", "Python", "Kotlin"],
    tags: ["PS", "알고리즘", contest.type],
    url: contestUrl,
    sourceName: "Codeforces 공식 API",
    sourceType: "official-api",
    lastVerifiedAt: verifiedAt,
  };
};

const fetchCodeforces = async (verifiedAt) => {
  const response = await fetch(codeforcesEndpoint, {
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
        contest.startTimeSeconds <= horizonSeconds,
    )
    .map((contest) => normalizeCodeforces(contest, verifiedAt));
};

const deduplicate = (contests) => {
  const byUrl = new Map();
  const byTitleAndDate = new Map();

  for (const contest of contests) {
    const urlKey = canonicalUrl(contest.url);
    const titleDateKey = `${normalizeTitle(contest.title)}:${contest.applicationDeadline.slice(0, 10)}`;

    if (byUrl.has(urlKey) || byTitleAndDate.has(titleDateKey)) {
      continue;
    }

    byUrl.set(urlKey, contest);
    byTitleAndDate.set(titleDateKey, contest);
  }

  return [...byUrl.values()].sort(
    (a, b) =>
      new Date(a.applicationDeadline).getTime() -
      new Date(b.applicationDeadline).getTime(),
  );
};

const main = async () => {
  const verifiedAt = new Date().toISOString();
  const manual = await readJson(manualPath);
  let apiContests = [];

  try {
    apiContests = await fetchCodeforces(verifiedAt);
    console.log(`Codeforces: 예정 대회 ${apiContests.length}개 수집`);
  } catch (error) {
    const previous = await readJson(outputPath).catch(() => ({ contests: [] }));
    apiContests = previous.contests.filter(
      (contest) =>
        contest.sourceName === "Codeforces 공식 API" &&
        new Date(contest.eventEnd).getTime() > Date.now(),
    );
    console.warn(
      `Codeforces 수집 실패, 기존 데이터 ${apiContests.length}개 유지:`,
      error instanceof Error ? error.message : error,
    );
  }

  const contests = deduplicate([...manual, ...apiContests]).filter(
    (contest) => new Date(contest.eventEnd).getTime() > Date.now(),
  );

  await writeFile(
    outputPath,
    `${JSON.stringify({ updatedAt: verifiedAt, contests }, null, 2)}\n`,
    "utf8",
  );

  console.log(`총 ${contests.length}개 대회를 ${outputPath}에 저장`);
};

await main();
