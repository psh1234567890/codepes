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

const stripVisibleHtml = (value) =>
  stripHtml(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " "),
  );

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

const parseHumanDurationMs = (value) => {
  const match = value
    .trim()
    .match(/^([\d.]+)\s+(minute|hour|day|week|month|year)s?$/i);
  if (!match) return undefined;
  const amount = Number.parseFloat(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  const unitDays = {
    minute: 1 / (24 * 60),
    hour: 1 / 24,
    day: 1,
    week: 7,
    month: 30,
    year: 365,
  };
  return amount * unitDays[match[2].toLowerCase()] * DAY_MS;
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

export const normalizeCtftimePayload = (
  payload,
  verifiedAt,
  now = Date.now(),
  horizonDays = 120,
  limit = 30,
) => {
  if (!Array.isArray(payload)) {
    throw new Error("CTFtime API 응답 형식이 올바르지 않습니다.");
  }

  return payload
    .flatMap((event) => {
      const id = Number(event?.id);
      const title = typeof event?.title === "string" ? event.title.trim() : "";
      const start = Date.parse(event?.start);
      const end = Date.parse(event?.finish);
      const url =
        typeof event?.ctftime_url === "string" ? event.ctftime_url.trim() : "";
      if (
        !Number.isInteger(id) ||
        !title ||
        /\b(?:cancelled|canceled|postponed)\b/i.test(title) ||
        !/^https:\/\/ctftime\.org\/event\/\d+\/?$/i.test(url) ||
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        end <= start ||
        !isWithinHorizon(start, now, horizonDays)
      ) {
        return [];
      }

      const restriction =
        typeof event.restrictions === "string" && event.restrictions.trim()
          ? event.restrictions.trim()
          : "공식 페이지 확인";
      const organizers = Array.isArray(event.organizers)
        ? event.organizers
            .map((organizer) =>
              typeof organizer?.name === "string" ? organizer.name.trim() : "",
            )
            .filter(Boolean)
        : [];
      const organizer = organizers.join(", ") || "CTFtime 등록 주최자";
      const format =
        typeof event.format === "string" && event.format.trim()
          ? event.format.trim()
          : "CTF";
      const isOnline = event.onsite !== true;
      if (!isOnline || !/^open$/i.test(restriction)) return [];
      const location =
        typeof event.location === "string" && event.location.trim()
          ? event.location.trim()
          : isOnline
            ? "온라인"
            : "공식 페이지 확인";

      return [
        {
          id: `ctftime-${id}`,
          title,
          summary: `${organizer}에서 진행하는 ${format} 형식의 보안 CTF입니다. 참가 전에 CTFtime의 제한 조건과 주최 측 규정을 확인하세요.`,
          type: "security",
          organizer,
          eligibilities: ["anyone"],
          eligibilityNote:
            "CTFtime 등록 기준 Online·Open 대회로 한국에서 온라인 참가 가능",
          mode: "online",
          applicationDeadline: new Date(start).toISOString(),
          deadlineKind: "start",
          eventStart: new Date(start).toISOString(),
          eventEnd: new Date(end).toISOString(),
          location,
          teamSize: "대회별 공식 규정 확인",
          tags: ["보안", "CTF", format, "한국 온라인 참가 가능"],
          url,
          sourceName: "CTFtime 공식 API",
          sourceType: "official-api",
          lastVerifiedAt: verifiedAt,
        },
      ];
    })
    .sort(
      (a, b) =>
        new Date(a.eventStart).getTime() - new Date(b.eventStart).getTime(),
    )
    .slice(0, limit);
};

export const normalizeItchJamsHtml = (
  html,
  verifiedAt,
  now = Date.now(),
  horizonDays = 180,
  limit = 20,
) => {
  if (!html.includes("jam_grid_widget")) {
    throw new Error("itch.io Upcoming Game Jams 영역을 찾지 못했습니다.");
  }

  return html
    .split(/<div class="jam lazy_images">/i)
    .slice(1)
    .flatMap((segment) => {
      const titleMatch = segment.match(
        /<div class="primary_info">[\s\S]*?<h3[^>]*><a href="\/jam\/([^"]+)">([\s\S]*?)<\/a>/i,
      );
      const hostMatch = segment.match(
        /<div class="hosted_by meta_row">([\s\S]*?)<\/div>/i,
      );
      const startMatch = segment.match(
        /<span class="date_countdown"[^>]*>([^<]+)<\/span>/i,
      );
      const durationMatch = segment.match(
        /<span class="date_duration">([^<]+)<\/span>/i,
      );
      if (!titleMatch || !startMatch || !durationMatch) return [];

      const slug = titleMatch[1].trim();
      const title = stripHtml(titleMatch[2]);
      const start = Date.parse(stripHtml(startMatch[1]));
      const duration = parseHumanDurationMs(stripHtml(durationMatch[1]));
      if (
        !slug ||
        !title ||
        !Number.isFinite(start) ||
        duration === undefined ||
        duration > 60 * DAY_MS ||
        !isWithinHorizon(start, now, horizonDays)
      ) {
        return [];
      }

      const hostText = hostMatch ? stripHtml(hostMatch[1]) : "";
      const organizer =
        hostText
          .replace(/^Hosted by\s+/i, "")
          .replace(/\s+([,;:])/g, "$1")
          .trim() || "itch.io 등록 주최자";
      const end = start + duration;

      return [
        {
          id: `itch-${slug}`,
          title,
          summary: `${organizer}에서 itch.io를 통해 진행하는 공개 게임잼입니다. 제출 형식과 참가 조건은 각 게임잼 공식 페이지에서 확인하세요.`,
          type: "game",
          organizer,
          eligibilities: ["rules"],
          eligibilityNote: "연령·팀 구성·사용 가능 에셋 등 게임잼별 규정 확인 필요",
          mode: "online",
          applicationDeadline: new Date(end).toISOString(),
          eventStart: new Date(start).toISOString(),
          eventEnd: new Date(end).toISOString(),
          location: "온라인",
          teamSize: "게임잼별 공식 규정 확인",
          tags: ["게임", "게임잼", "itch.io"],
          url: `https://itch.io/jam/${slug}`,
          sourceName: "itch.io 공식 게임잼 목록",
          sourceType: "official-page",
          lastVerifiedAt: verifiedAt,
        },
      ];
    })
    .slice(0, limit);
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
  if (/공식 페이지 확인/.test(location)) return "hybrid";
  return "offline";
};

export const getDevpostKoreanOnlineEvidence = (hackathon, rulesHtml) => {
  const location =
    typeof hackathon?.displayed_location?.location === "string"
      ? hackathon.displayed_location.location.trim()
      : "";
  if (!/online/i.test(location) || typeof rulesHtml !== "string") {
    return undefined;
  }

  const rulesText = stripVisibleHtml(rulesHtml);
  if (!rulesText) return undefined;

  const koreaDenied =
    /(?:not eligible|ineligible|excluded|may not participate)[^.!?]{0,120}(?:south korea|republic of korea|korea,\s*republic of)/i.test(
      rulesText,
    ) ||
    /(?:south korea|republic of korea|korea,\s*republic of)[^.!?]{0,120}(?:not eligible|ineligible|excluded|may not participate)/i.test(
      rulesText,
    );
  if (koreaDenied) return undefined;

  const explicitKorea =
    /(?:open|eligible|welcome|participants?)[^.!?]{0,160}(?:south korea|republic of korea|korea,\s*republic of)/i.test(
      rulesText,
    ) ||
    /(?:south korea|republic of korea|korea,\s*republic of)[^.!?]{0,160}(?:open|eligible|welcome|participants?)/i.test(
      rulesText,
    );
  if (explicitKorea) return "공식 규정에 대한민국 참가 가능 명시";

  const globalParticipationPatterns = [
    /(?:open|eligible|welcome|welcomes?|participants?|participation)[^.!?]{0,180}\b(?:worldwide|globally|around the world|all countries|any country|any location)\b/i,
    /\b(?:worldwide|globally|around the world|all countries|any country|any location)\b[^.!?]{0,180}(?:open|eligible|welcome|welcomes?|participants?|participation)/i,
    /participants? from any location (?:are )?welcome/i,
    /no restrictions? on nationality/i,
    /regardless of (?:their )?(?:country|location|nationality|place of residence)/i,
    /country of residence,\s*in all countries except/i,
    /open to (?:anyone|everyone)\b/i,
  ];
  if (globalParticipationPatterns.some((pattern) => pattern.test(rulesText))) {
    return "공식 규정에 전 세계 온라인 참가 가능 명시";
  }

  const sanctionedCountriesOnly =
    /(?:countries under[^.!?]{0,120}(?:embargo|sanction)|office of foreign assets control|OFAC|laws[^.!?]{0,120}prohibits participating)/i.test(
      rulesText,
    ) && /north korea/i.test(rulesText);
  if (sanctionedCountriesOnly) {
    return "공식 규정상 제재 국가 외 온라인 참가 가능";
  }

  return undefined;
};

export const normalizeDevpostHackathon = (
  hackathon,
  scheduleHtml,
  rulesHtml,
  verifiedAt,
  now = Date.now(),
) => {
  if (!hackathon || hackathon.invite_only === true) return undefined;
  const koreanOnlineEvidence = getDevpostKoreanOnlineEvidence(
    hackathon,
    rulesHtml,
  );
  if (!koreanOnlineEvidence) return undefined;
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
    typeof hackathon.displayed_location?.location === "string" &&
    hackathon.displayed_location.location.trim()
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
    eligibilityNote: `${koreanOnlineEvidence}. 연령·팀 구성 등 세부 조건은 공식 규정 확인 필요`,
    mode: devpostMode(location),
    applicationDeadline: new Date(deadline).toISOString(),
    eventStart: new Date(start).toISOString(),
    eventEnd: new Date(deadline).toISOString(),
    location,
    teamSize: "대회별 공식 규정 확인",
    tags: ["해커톤", "Devpost", "한국 온라인 참가 가능", ...themes],
    url,
    sourceName: "Devpost 공식 목록·일정",
    sourceType: "official-api",
    lastVerifiedAt: verifiedAt,
  };
};
