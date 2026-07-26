export const normalizeTitle = (title) =>
  title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");

export const canonicalUrl = (url) => {
  const parsed = new URL(url);
  for (const key of [...parsed.searchParams.keys()]) {
    if (/^(utm_.+|ref|source)$/i.test(key)) {
      parsed.searchParams.delete(key);
    }
  }
  parsed.searchParams.sort();
  parsed.hash = "";
  const pathname = parsed.pathname.replace(/\/$/, "") || "/";
  return `${parsed.protocol.toLowerCase()}//${parsed.host.toLowerCase()}${pathname}${parsed.search}`;
};

export const toIso = (seconds) => new Date(seconds * 1000).toISOString();

const TYPES = new Set(["ps", "hackathon", "ai-data", "game", "security"]);
const ELIGIBILITIES = new Set([
  "anyone",
  "university",
  "youth",
  "employee",
]);
const MODES = new Set(["online", "offline", "hybrid"]);
const SOURCE_TYPES = new Set([
  "official-api",
  "official-page",
  "submitted",
]);

export const validateContests = (contests) => {
  if (!Array.isArray(contests)) {
    throw new Error("Contest data must be an array.");
  }

  const ids = new Set();
  const urls = new Set();
  for (const [index, contest] of contests.entries()) {
    const prefix = `Contest ${index + 1}`;
    if (!contest || typeof contest !== "object") {
      throw new Error(`${prefix} must be an object.`);
    }
    if (typeof contest.id !== "string" || contest.id.trim() === "") {
      throw new Error(`${prefix} has no id.`);
    }
    if (ids.has(contest.id)) {
      throw new Error(`${prefix} has a duplicate id: ${contest.id}`);
    }
    ids.add(contest.id);
    for (const field of [
      "title",
      "summary",
      "organizer",
      "location",
      "sourceName",
    ]) {
      if (typeof contest[field] !== "string" || contest[field].trim() === "") {
        throw new Error(`${prefix} has no ${field}.`);
      }
    }
    if (!TYPES.has(contest.type)) {
      throw new Error(`${prefix} has an invalid type.`);
    }
    if (
      !Array.isArray(contest.eligibilities) ||
      contest.eligibilities.length === 0 ||
      contest.eligibilities.some((item) => !ELIGIBILITIES.has(item))
    ) {
      throw new Error(`${prefix} has invalid eligibility.`);
    }
    if (!MODES.has(contest.mode)) {
      throw new Error(`${prefix} has an invalid mode.`);
    }
    if (!SOURCE_TYPES.has(contest.sourceType)) {
      throw new Error(`${prefix} has an invalid source type.`);
    }
    if (
      contest.deadlineKind !== undefined &&
      !["application", "start"].includes(contest.deadlineKind)
    ) {
      throw new Error(`${prefix} has an invalid deadline kind.`);
    }
    if (
      !Array.isArray(contest.tags) ||
      contest.tags.some((tag) => typeof tag !== "string" || tag.trim() === "")
    ) {
      throw new Error(`${prefix} has invalid tags.`);
    }
    for (const field of [
      "applicationDeadline",
      "eventStart",
      "eventEnd",
      "lastVerifiedAt",
    ]) {
      if (!Number.isFinite(Date.parse(contest[field]))) {
        throw new Error(`${prefix} has an invalid ${field}.`);
      }
    }
    const url = new URL(contest.url);
    if (url.protocol !== "https:") {
      throw new Error(`${prefix} must use an HTTPS official URL.`);
    }
    const normalizedUrl = canonicalUrl(contest.url);
    if (urls.has(normalizedUrl)) {
      throw new Error(`${prefix} has a duplicate official URL.`);
    }
    urls.add(normalizedUrl);
    if (Date.parse(contest.eventStart) > Date.parse(contest.eventEnd)) {
      throw new Error(`${prefix} has an event end before its start.`);
    }
  }

  return contests;
};

export const deduplicate = (contests, onDuplicate = () => {}) => {
  const byUrl = new Map();
  const byTitleAndDate = new Map();

  for (const contest of contests) {
    const urlKey = canonicalUrl(contest.url);
    const titleDateKey = `${normalizeTitle(contest.title)}:${contest.applicationDeadline.slice(0, 10)}`;

    if (byUrl.has(urlKey) || byTitleAndDate.has(titleDateKey)) {
      onDuplicate({
        contest,
        reason: byUrl.has(urlKey) ? "official-url" : "title-and-date",
      });
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
