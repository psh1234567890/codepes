const DAY_MS = 24 * 60 * 60 * 1000;

const decodeHtml = (value) =>
  value
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&#(\d+);/g, (_match, code) =>
      String.fromCodePoint(Number.parseInt(code, 10)),
    )
    .replace(
      /&(amp|quot|apos|lt|gt|nbsp);/g,
      (_match, entity) =>
        ({
          amp: "&",
          quot: '"',
          apos: "'",
          lt: "<",
          gt: ">",
          nbsp: " ",
        })[entity],
    );

const stripHtml = (value) =>
  decodeHtml(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());

const isWithinHorizon = (timestamp, now, horizonDays) =>
  timestamp > now && timestamp <= now + horizonDays * DAY_MS;

const normalizeAtCoderTimestamp = (value) => {
  const match = value.trim().match(
    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})([+-])(\d{2})(\d{2})$/,
  );
  if (!match) return undefined;
  const [, year, month, day, hour, minute, second, sign, zoneHour, zoneMinute] =
    match;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}${sign}${zoneHour}:${zoneMinute}`;
};

const parseDurationMs = (value) => {
  const match = value.trim().match(/^(\d+):(\d{2})$/);
  if (!match) return undefined;
  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  return (hours * 60 + minutes) * 60 * 1000;
};

export const normalizeAtCoderHtml = (
  html,
  verifiedAt,
  now = Date.now(),
  horizonDays = 180,
) => {
  const sectionStart = html.indexOf('id="contest-table-upcoming"');
  if (sectionStart < 0) {
    throw new Error("AtCoder 예정 대회 영역을 찾지 못했습니다.");
  }
  const nextSection = html.indexOf('id="contest-table-daily"', sectionStart);
  const section =
    nextSection > sectionStart
      ? html.slice(sectionStart, nextSection)
      : html.slice(sectionStart);

  const contests = [];
  for (const rowMatch of section.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)) {
    const row = rowMatch[1];
    const timeMatch = row.match(/<time[^>]*>([^<]+)<\/time>/i);
    const linkMatch = row.match(
      /<a\s+href="\/contests\/([^"]+)"[^>]*>([\s\S]*?)<\/a>/i,
    );
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(
      (match) => stripHtml(match[1]),
    );
    if (!timeMatch || !linkMatch || cells.length < 3) continue;

    const startIso = normalizeAtCoderTimestamp(timeMatch[1]);
    const durationMs = parseDurationMs(cells[2]);
    if (!startIso || durationMs === undefined) continue;
    const start = Date.parse(startIso);
    if (!Number.isFinite(start) || !isWithinHorizon(start, now, horizonDays)) {
      continue;
    }

    const slug = linkMatch[1];
    const title = stripHtml(linkMatch[2]);
    const category =
      row.match(/title="(Algorithm|Heuristic)"/i)?.[1] ?? "Algorithm";

    contests.push({
      id: `atcoder-${slug}`,
      title,
      summary:
        "AtCoder의 온라인 알고리즘 대회로, 별도 사전 신청 없이 시작 시각부터 참가할 수 있습니다.",
      type: "ps",
      organizer: "AtCoder",
      eligibilities: ["anyone"],
      eligibilityNote: "AtCoder 계정이 있는 누구나, 대회별 Rated Range 확인 필요",
      mode: "online",
      applicationDeadline: new Date(start).toISOString(),
      deadlineKind: "start",
      eventStart: new Date(start).toISOString(),
      eventEnd: new Date(start + durationMs).toISOString(),
      location: "온라인",
      teamSize: "개인",
      tags: ["PS", "알고리즘", "AtCoder", category],
      url: `https://atcoder.jp/contests/${slug}`,
      sourceName: "AtCoder 공식 대회 목록",
      sourceType: "official-page",
      lastVerifiedAt: verifiedAt,
    });
  }
  return contests;
};

export const normalizeCodeChefPayload = (
  payload,
  verifiedAt,
  now = Date.now(),
  horizonDays = 180,
) => {
  if (!payload || !Array.isArray(payload.future_contests)) {
    throw new Error("CodeChef API 응답 형식이 다릅니다.");
  }

  return payload.future_contests.flatMap((contest) => {
    const code =
      typeof contest.contest_code === "string"
        ? contest.contest_code.trim()
        : "";
    const title =
      typeof contest.contest_name === "string"
        ? contest.contest_name.trim()
        : "";
    const start = Date.parse(contest.contest_start_date_iso);
    const end = Date.parse(contest.contest_end_date_iso);
    if (
      !code ||
      !title ||
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      end <= start ||
      !isWithinHorizon(start, now, horizonDays)
    ) {
      return [];
    }

    return [
      {
        id: `codechef-${code.toLocaleLowerCase("en-US")}`,
        title,
        summary:
          "CodeChef의 온라인 알고리즘 대회로, 별도 사전 신청 없이 시작 시각부터 참가할 수 있습니다.",
        type: "ps",
        organizer: "CodeChef",
        eligibilities: ["anyone"],
        eligibilityNote: "CodeChef 계정이 있는 누구나, 대회별 Division 확인 필요",
        mode: "online",
        applicationDeadline: new Date(start).toISOString(),
        deadlineKind: "start",
        eventStart: new Date(start).toISOString(),
        eventEnd: new Date(end).toISOString(),
        location: "온라인",
        teamSize: "개인",
        tags: ["PS", "알고리즘", "CodeChef"],
        url: `https://www.codechef.com/${encodeURIComponent(code)}`,
        sourceName: "CodeChef 공식 API",
        sourceType: "official-api",
        lastVerifiedAt: verifiedAt,
      },
    ];
  });
};

export const extractDevpostSubmissionDates = (html) => {
  const rowMatch = html.match(
    /<tr>\s*<td[^>]*class="active"[^>]*>\s*Submissions\s*<\/td>([\s\S]*?)<\/tr>/i,
  );
  if (!rowMatch) return undefined;
  const dates = [
    ...rowMatch[1].matchAll(/data-iso-date="([^"]+)"/gi),
  ].map((match) => match[1]);
  if (dates.length < 2) return undefined;
  return { start: dates[0], deadline: dates[1] };
};

const devpostMode = (location) => {
  if (/^online$/i.test(location.trim())) return "online";
  if (/online/i.test(location)) return "hybrid";
  return "offline";
};

export const normalizeDevpostHackathon = (
  hackathon,
  scheduleHtml,
  verifiedAt,
  now = Date.now(),
) => {
  if (!hackathon || hackathon.invite_only === true) return undefined;
  const id = Number(hackathon.id);
  const title =
    typeof hackathon.title === "string" ? hackathon.title.trim() : "";
  const url = typeof hackathon.url === "string" ? hackathon.url.trim() : "";
  const schedule = extractDevpostSubmissionDates(scheduleHtml);
  if (!Number.isInteger(id) || !title || !url || !schedule) return undefined;

  const start = Date.parse(schedule.start);
  const deadline = Date.parse(schedule.deadline);
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(deadline) ||
    deadline <= now ||
    deadline < start
  ) {
    return undefined;
  }

  const location =
    typeof hackathon.displayed_location?.location === "string"
      ? hackathon.displayed_location.location.trim()
      : "대회별 공식 페이지 확인";
  const organizer =
    typeof hackathon.organization_name === "string" &&
    hackathon.organization_name.trim()
      ? hackathon.organization_name.trim()
      : "Devpost";
  const themes = Array.isArray(hackathon.themes)
    ? hackathon.themes
        .map((theme) =>
          typeof theme?.name === "string" ? theme.name.trim() : "",
        )
        .filter(Boolean)
    : [];

  return {
    id: `devpost-${id}`,
    title,
    summary: `${organizer}이(가) Devpost에서 운영하는 공개 해커톤입니다. 참가 전 공식 규정과 제출 조건을 확인하세요.`,
    type: "hackathon",
    organizer,
    eligibilities: ["rules"],
    eligibilityNote: "연령·거주지·팀 구성 등 대회별 공식 규정 확인 필요",
    mode: devpostMode(location),
    applicationDeadline: new Date(deadline).toISOString(),
    eventStart: new Date(start).toISOString(),
    eventEnd: new Date(deadline).toISOString(),
    location,
    teamSize: "대회별 공식 규정 확인",
    tags: ["해커톤", "Devpost", ...themes],
    url,
    sourceName: "Devpost 공식 목록·일정",
    sourceType: "official-api",
    lastVerifiedAt: verifiedAt,
  };
};
