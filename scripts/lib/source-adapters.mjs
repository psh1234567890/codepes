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

const toKoreanIso = (year, month, day, time) => {
  const timeMatch = String(time).match(/^(\d{1,2}):(\d{2})$/);
  if (!timeMatch) return undefined;
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(timeMatch[1]).padStart(2, "0")}:${timeMatch[2]}:00+09:00`;
  const timestamp = Date.parse(iso);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined;
};

const isFutureDeadline = (iso, now) =>
  typeof iso === "string" && Date.parse(iso) > now;

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

export const getItchKoreanOnlineEvidence = (detailHtml) => {
  if (typeof detailHtml !== "string") return undefined;
  const text = stripVisibleHtml(detailHtml);
  if (!/Submissions\s+open\s+from/i.test(text)) return undefined;

  const inPersonOnlyPatterns = [
    /\b(?:in[ -]?person|on[ -]?site)\s+(?:only|required)\b/i,
    /\b(?:must|required to)\s+(?:attend|participate)\s+(?:in[ -]?person|on[ -]?site)\b/i,
  ];
  if (inPersonOnlyPatterns.some((pattern) => pattern.test(text))) {
    return undefined;
  }

  const publicParticipationPatterns = [
    /\b(?:anyone|everyone)\s+(?:can|may|is welcome to)\s+(?:participate|join)\b/i,
    /\b(?:game\s*jam|jam|participation)\s+is\s+open\s+to\s+(?:anyone|everyone)\b/i,
    /\bopen\s+to\s+(?:anyone|everyone),?\s+(?:from\s+anywhere|worldwide)\b/i,
  ];
  if (
    publicParticipationPatterns.some((pattern) => pattern.test(text))
  ) {
    return "공식 게임잼 페이지에 누구나 온라인 참가 가능 명시";
  }

  return undefined;
};

export const verifyItchJam = (contest, detailHtml) => {
  if (
    !contest ||
    contest.sourceName !== "itch.io 공식 게임잼 목록" ||
    contest.mode !== "online"
  ) {
    return undefined;
  }
  const evidence = getItchKoreanOnlineEvidence(detailHtml);
  if (!evidence) return undefined;

  return {
    ...contest,
    eligibilities: ["anyone"],
    eligibilityNote: `${evidence}. 수상·연령·팀 구성·사용 가능 에셋 등 세부 조건은 공식 규정 확인 필요`,
    tags: [
      ...new Set([
        ...contest.tags,
        "누구나 참가",
        "한국 온라인 참가 가능",
      ]),
    ],
  };
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
  const aiDataEvidence = [
    title,
    ...themes,
  ].join(" ");
  const type =
    /(?:\b(?:AI|ML|LLM|NLP|GenAI)\b|machine learning|deep learning|artificial intelligence|computer vision|data science|생성형\s*AI|인공지능|머신러닝|딥러닝)/iu.test(
      aiDataEvidence,
    )
      ? "ai-data"
      : "hackathon";

  return {
    id: `devpost-${id}`,
    title,
    summary: `Devpost에 등록된 ${type === "ai-data" ? "AI·데이터 " : ""}공개 해커톤입니다. 주최 기관은 ${organizer}입니다. 참가 전 공식 규정과 제출 조건을 확인하세요.`,
    type,
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

export const extractKoiGuideLinks = (html) => {
  if (typeof html !== "string") return [];
  return [
    ...new Set(
      [...html.matchAll(/href="(\/koi\/\d{4}\/[12]\/)"/gi)].map(
        (match) => new URL(match[1], "https://koi.or.kr").href,
      ),
    ),
  ];
};

export const normalizeKoiGuideHtml = (
  html,
  guideUrl,
  verifiedAt,
  now = Date.now(),
) => {
  const urlMatch = String(guideUrl).match(
    /^https:\/\/koi\.or\.kr\/koi\/(\d{4})\/([12])\/?$/i,
  );
  if (!urlMatch || typeof html !== "string") return undefined;

  const year = Number.parseInt(urlMatch[1], 10);
  const round = Number.parseInt(urlMatch[2], 10);
  const text = stripVisibleHtml(html);
  if (
    !text.includes(`${year}년도 한국정보올림피아드 ${round}차 대회`) ||
    !text.includes("접수") ||
    !text.includes("대회 개최")
  ) {
    return undefined;
  }

  const registration = text.match(
    /접수(?:\s+일정)?\s+(\d{1,2})\/(\d{1,2})[^0-9]{0,12}(\d{1,2}:\d{2})\s*[-–~]\s*(\d{1,2})\/(\d{1,2})[^0-9]{0,12}(\d{1,2}:\d{2})/i,
  );
  const event = text.match(
    /대회 개최\s+(\d{1,2})\/(\d{1,2})[^0-9]{0,12}(\d{1,2}:\d{2})\s*[-–~]\s*(\d{1,2}:\d{2})/i,
  );
  if (!registration || !event) return undefined;

  const applicationDeadline = toKoreanIso(
    year,
    registration[4],
    registration[5],
    registration[6],
  );
  const eventStart = toKoreanIso(year, event[1], event[2], event[3]);
  const eventEnd = toKoreanIso(year, event[1], event[2], event[4]);
  if (
    !isFutureDeadline(applicationDeadline, now) ||
    !eventStart ||
    !eventEnd ||
    Date.parse(eventEnd) <= Date.parse(eventStart)
  ) {
    return undefined;
  }

  const isOnline = /온라인으로\s*개최/.test(text);
  const isOffline = /오프라인으로\s*개최|대면으로\s*개최/.test(text);
  if (!isOnline && !isOffline) return undefined;

  return {
    id: `koi-${year}-${round}`,
    title: `${year}년도 한국정보올림피아드 ${round}차 대회`,
    summary:
      "한국정보올림피아드 공식 안내에 게시된 접수 일정과 개최 시간을 확인한 청소년 알고리즘 대회입니다.",
    type: "ps",
    organizer: "한국정보올림피아드",
    eligibilities: ["youth"],
    eligibilityNote:
      round === 1
        ? "초·중·고등부 세부 참가 자격은 해당 연도 공식 안내 확인 필요"
        : "1차 대회 수상 기준 등 2차 대회 참가 자격은 공식 안내 확인 필요",
    mode: isOnline ? "online" : "offline",
    applicationDeadline,
    eventStart,
    eventEnd,
    location: isOnline ? "온라인" : "공식 안내 페이지의 고사장 확인",
    teamSize: "개인",
    languages: ["C", "C++", "Python", "Java"],
    tags: ["PS", "알고리즘", "KOI", "청소년"],
    url: new URL(guideUrl).href,
    sourceName: "한국정보올림피아드 공식 안내",
    sourceType: "official-page",
    lastVerifiedAt: verifiedAt,
  };
};

export const extractKitpaContestDetailUrl = (html) => {
  if (typeof html !== "string") return undefined;
  const ids = [...html.matchAll(/href="\/contest\/(\d+)"/gi)]
    .map((match) => Number.parseInt(match[1], 10))
    .filter(Number.isInteger);
  if (ids.length === 0) return undefined;
  return `https://kitpa.org/contest/${Math.max(...ids)}`;
};

export const extractKitpaYouthCandidateUrls = (html) => {
  if (typeof html !== "string") return [];
  const candidates = [];
  for (const match of html.matchAll(
    /<a[^>]+href="(\/(?:contest|notice)\/\d+)"[^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    if (/청소년\s+IT경시대회/i.test(stripHtml(match[2]))) {
      candidates.push(new URL(match[1], "https://kitpa.org").href);
    }
  }
  return [...new Set(candidates)];
};

export const normalizeKitpaYouthContestHtml = (
  html,
  detailUrl,
  verifiedAt,
  now = Date.now(),
) => {
  if (
    typeof html !== "string" ||
    !/^https:\/\/kitpa\.org\/(?:contest|notice)\/\d+\/?$/i.test(
      String(detailUrl),
    )
  ) {
    return undefined;
  }

  const text = stripVisibleHtml(html);
  const titleMatch = text.match(
    /(\d{4})\s+제(\d+)회\s+청소년\s+IT경시대회/i,
  );
  const registration = text.match(
    /추가접수기간\s*:\s*(\d{1,2})월\s*(\d{1,2})일[^~]{0,30}~\s*(\d{1,2})월\s*(\d{1,2})일[^0-9]{0,20}(\d{1,2}:\d{2})/i,
  );
  const eventDate =
    text.match(
      /시험일시\s*:\s*(\d{1,2})월\s*(\d{1,2})일[^0-9]{0,20}/i,
    ) ??
    text.match(
      /(\d{1,2})월\s*(\d{1,2})일[^:]{0,20}:\s*대회 개최/i,
    );
  if (!titleMatch || !registration || !eventDate) return undefined;

  const year = Number.parseInt(titleMatch[1], 10);
  const applicationDeadline = toKoreanIso(
    year,
    registration[3],
    registration[4],
    registration[5],
  );
  const eventDateIndex = text.indexOf(eventDate[0]);
  const eventSection = text.slice(eventDateIndex, eventDateIndex + 2500);
  const testTimes = [
    ...eventSection.matchAll(
      /시험\s*(\d{1,2}:\d{2})\s*~\s*(\d{1,2}:\d{2})/gi,
    ),
  ];
  if (!isFutureDeadline(applicationDeadline, now) || testTimes.length === 0) {
    return undefined;
  }

  const starts = testTimes
    .map((match) =>
      toKoreanIso(year, eventDate[1], eventDate[2], match[1]),
    )
    .filter(Boolean)
    .sort();
  const ends = testTimes
    .map((match) =>
      toKoreanIso(year, eventDate[1], eventDate[2], match[2]),
    )
    .filter(Boolean)
    .sort();
  const eventStart = starts[0];
  const eventEnd = ends.at(-1);
  if (
    !eventStart ||
    !eventEnd ||
    Date.parse(eventEnd) <= Date.parse(eventStart) ||
    !/온라인 수험장|온라인으로\s*진행/.test(text)
  ) {
    return undefined;
  }

  return {
    id: `kitpa-youth-it-${year}-${titleMatch[2]}`,
    title: `${year} 제${titleMatch[2]}회 청소년 IT경시대회`,
    summary:
      "한국정보기술진흥원 공식 안내에서 접수 마감과 온라인 시험 시간을 확인한 전국 청소년 IT 경시대회입니다.",
    type: "ps",
    organizer: "한국정보기술진흥원",
    eligibilities: ["youth"],
    eligibilityNote:
      "전국 초·중·고 재학생 또는 이에 준하는 청소년 대상이며 출생연도·진학 여부별 제한은 공식 안내 확인 필요",
    mode: "online",
    applicationDeadline,
    eventStart,
    eventEnd,
    location: "온라인 수험장",
    teamSize: "개인",
    languages: ["C", "C++", "Python", "Java"],
    tags: ["PS", "알고리즘", "IT", "청소년"],
    url: new URL(detailUrl).href,
    sourceName: "한국정보기술진흥원 공식 경시대회",
    sourceType: "official-page",
    lastVerifiedAt: verifiedAt,
  };
};

export const extractUcpcEditionUrl = (html) => {
  if (typeof html !== "string") return undefined;
  const editions = [
    ...html.matchAll(/href="https:\/\/(\d{4})\.ucpc\.me\/?"/gi),
  ].map((match) => Number.parseInt(match[1], 10));
  if (editions.length === 0) return undefined;
  return `https://${Math.max(...editions)}.ucpc.me/`;
};

export const normalizeUcpcHtml = (
  editionHtml,
  qualifierHtml,
  editionUrl,
  verifiedAt,
  now = Date.now(),
) => {
  const urlMatch = String(editionUrl).match(
    /^https:\/\/(\d{4})\.ucpc\.me\/?$/i,
  );
  if (
    !urlMatch ||
    typeof editionHtml !== "string" ||
    typeof qualifierHtml !== "string"
  ) {
    return undefined;
  }

  const year = Number.parseInt(urlMatch[1], 10);
  const editionText = stripVisibleHtml(editionHtml);
  const qualifierText = stripVisibleHtml(qualifierHtml);
  if (
    !editionText.includes(`UCPC ${year}`) ||
    !editionText.includes("전국 대학생 프로그래밍 대회 동아리 연합")
  ) {
    return undefined;
  }

  const registration = editionText.match(
    /참가 신청\s*[—–-][\s\S]{0,120}?부터\s*(\d{1,2})월\s*(\d{1,2})일[^0-9]{0,30}(\d{1,2}:\d{2})/i,
  );
  const qualifierDate = qualifierText.match(
    /(\d{1,2})월\s*(\d{1,2})일[^,]{0,30},\s*온라인으로 진행/i,
  );
  const qualifierSchedule = qualifierText.match(
    /(\d{1,2}:\d{2})\s*~\s*(\d{1,2}:\d{2})\s*예선 대회를 진행/i,
  );
  if (!registration || !qualifierDate || !qualifierSchedule) {
    return undefined;
  }

  const applicationDeadline = toKoreanIso(
    year,
    registration[1],
    registration[2],
    registration[3],
  );
  const eventStart = toKoreanIso(
    year,
    qualifierDate[1],
    qualifierDate[2],
    qualifierSchedule[1],
  );
  const eventEnd = toKoreanIso(
    year,
    qualifierDate[1],
    qualifierDate[2],
    qualifierSchedule[2],
  );
  if (
    !isFutureDeadline(applicationDeadline, now) ||
    !eventStart ||
    !eventEnd ||
    Date.parse(eventEnd) <= Date.parse(eventStart)
  ) {
    return undefined;
  }

  return {
    id: `ucpc-${year}`,
    title: `UCPC ${year}`,
    summary:
      "전국 대학생 프로그래밍 대회 동아리 연합이 주최하는 팀 알고리즘 대회로, 온라인 예선과 오프라인 본선으로 진행됩니다.",
    type: "ps",
    organizer: "전국 대학생 프로그래밍 대회 동아리 연합",
    eligibilities: ["university"],
    eligibilityNote:
      "학·석사과정 재·휴학생 및 수료생 대상이며 졸업생 제외 등 세부 자격은 공식 안내 확인 필요",
    mode: "hybrid",
    applicationDeadline,
    eventStart,
    eventEnd,
    location: "온라인 예선 · 본선 장소는 공식 안내 확인",
    teamSize: "3인 팀",
    languages: ["C", "C++", "Java", "Python"],
    tags: ["PS", "알고리즘", "UCPC", "대학생", "팀 대회"],
    url: new URL(editionUrl).href,
    sourceName: "UCPC 공식 대회 안내",
    sourceType: "official-page",
    lastVerifiedAt: verifiedAt,
  };
};

export const normalizeKookminAlgorithmHtml = (
  html,
  pageUrl,
  verifiedAt,
  now = Date.now(),
) => {
  if (
    typeof html !== "string" ||
    !/^https:\/\/software\.kookmin\.ac\.kr\//i.test(String(pageUrl))
  ) {
    return undefined;
  }

  const text = stripVisibleHtml(html);
  const editionMatch = text.match(/제(\d+)회\s+국민대학교\s+알고리즘\s*대회/i);
  const registration = text.match(
    /지원서 접수\s+(\d{4})\.(\d{1,2})\.(\d{1,2})[^0-9]{0,12}(\d{1,2}:\d{2})\s*~\s*(\d{1,2})\.(\d{1,2})[^0-9]{0,12}(\d{1,2}:\d{2})/i,
  );
  const event = text.match(
    /대회\s+(\d{4})\.(\d{1,2})\.(\d{1,2})[^0-9]{0,12}(\d{1,2}:\d{2})\s*~\s*(\d{1,2}:\d{2})\s+대면 시험 진행/i,
  );
  if (!editionMatch || !registration || !event) return undefined;

  const year = Number.parseInt(registration[1], 10);
  const applicationDeadline = toKoreanIso(
    year,
    registration[5],
    registration[6],
    registration[7],
  );
  const eventStart = toKoreanIso(event[1], event[2], event[3], event[4]);
  const eventEnd = toKoreanIso(event[1], event[2], event[3], event[5]);
  if (
    !isFutureDeadline(applicationDeadline, now) ||
    !eventStart ||
    !eventEnd ||
    Date.parse(eventEnd) <= Date.parse(eventStart)
  ) {
    return undefined;
  }

  return {
    id: `kookmin-algorithm-${year}`,
    title: `제${editionMatch[1]}회 국민대학교 알고리즘 대회`,
    summary:
      "국민대학교 소프트웨어융합대학 공식 안내에서 지원서 접수와 대면 시험 일정을 확인한 고등학생 알고리즘 대회입니다.",
    type: "ps",
    organizer: "국민대학교 소프트웨어융합대학",
    eligibilities: ["youth"],
    eligibilityNote:
      "고등학교 재학생·졸업생 또는 동등 이상의 학력이 인정되는 사람 대상이며 세부 조건은 공식 요강 확인 필요",
    mode: "offline",
    applicationDeadline,
    eventStart,
    eventEnd,
    location: "국민대학교 교내 고사장",
    teamSize: "개인",
    languages: ["C++", "Java", "Python"],
    tags: ["PS", "알고리즘", "고등학생", "대학 주최"],
    url: new URL(pageUrl).href,
    sourceName: "국민대학교 공식 알고리즘대회",
    sourceType: "official-page",
    lastVerifiedAt: verifiedAt,
  };
};
