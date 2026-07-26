import { describe, expect, it } from "vitest";
import {
  extractDevpostSubmissionDates,
  normalizeAtCoderHtml,
  normalizeCodeChefPayload,
  normalizeCtftimePayload,
  normalizeDevpostHackathon,
  normalizeItchJamsHtml,
} from "./source-adapters.mjs";

const verifiedAt = "2026-07-26T00:00:00.000Z";
const now = Date.parse("2026-07-26T00:00:00.000Z");

describe("AtCoder source adapter", () => {
  it("parses only the official upcoming contest table", () => {
    const html = `
      <div id="contest-table-upcoming">
        <table><tbody><tr>
          <td><time>2026-08-01 21:00:00+0900</time></td>
          <td><span title="Algorithm">A</span><a href="/contests/abc469">AtCoder Beginner Contest 469</a></td>
          <td>01:40</td><td>- 1999</td>
        </tr></tbody></table>
      </div>
      <div id="contest-table-daily">
        <table><tbody><tr>
          <td><time>2026-08-02 20:00:00+0900</time></td>
          <td><a href="/contests/daily001">Daily Contest</a></td>
          <td>01:00</td><td>All</td>
        </tr></tbody></table>
      </div>`;

    const contests = normalizeAtCoderHtml(html, verifiedAt, now);
    expect(contests).toHaveLength(1);
    expect(contests[0]).toMatchObject({
      id: "atcoder-abc469",
      deadlineKind: "start",
      sourceType: "official-page",
    });
    expect(contests[0].eventEnd).toBe("2026-08-01T13:40:00.000Z");
  });
});

describe("CodeChef source adapter", () => {
  it("normalizes valid future contests and skips malformed rows", () => {
    const contests = normalizeCodeChefPayload(
      {
        future_contests: [
          {
            contest_code: "START249",
            contest_name: "Starters 249",
            contest_start_date_iso: "2026-07-29T20:00:00+05:30",
            contest_end_date_iso: "2026-07-29T22:00:00+05:30",
          },
          { contest_code: "", contest_name: "Invalid" },
        ],
      },
      verifiedAt,
      now,
    );

    expect(contests).toHaveLength(1);
    expect(contests[0]).toMatchObject({
      id: "codechef-start249",
      deadlineKind: "start",
      organizer: "CodeChef",
    });
  });
});

describe("Devpost source adapter", () => {
  const scheduleHtml = `
    <table><tbody><tr>
      <td class="active">Submissions</td>
      <td class="active" data-iso-date="2026-07-01T09:00:00-04:00">July 1</td>
      <td class="active" data-iso-date="2026-08-17T16:00:00-04:00">August 17</td>
    </tr></tbody></table>`;

  it("extracts exact ISO submission dates from the official schedule", () => {
    expect(extractDevpostSubmissionDates(scheduleHtml)).toEqual({
      start: "2026-07-01T09:00:00-04:00",
      deadline: "2026-08-17T16:00:00-04:00",
    });
  });

  it("marks public hackathon eligibility as rules-dependent", () => {
    const contest = normalizeDevpostHackathon(
      {
        id: 29541,
        title: "Build with Gemini XPRIZE",
        url: "https://xprize.devpost.com/",
        organization_name: "XPRIZE",
        invite_only: false,
        displayed_location: { location: "Online" },
        themes: [{ name: "Machine Learning/AI" }],
      },
      scheduleHtml,
      verifiedAt,
      now,
    );

    expect(contest).toMatchObject({
      id: "devpost-29541",
      type: "hackathon",
      eligibilities: ["rules"],
      mode: "online",
    });
  });

  it("does not publish invite-only hackathons", () => {
    expect(
      normalizeDevpostHackathon(
        { id: 1, title: "Private", invite_only: true },
        scheduleHtml,
        verifiedAt,
        now,
      ),
    ).toBeUndefined();
  });

  it("falls back when Devpost provides an empty location", () => {
    const contest = normalizeDevpostHackathon(
      {
        id: 29542,
        title: "Location Pending",
        url: "https://location-pending.devpost.com/",
        invite_only: false,
        displayed_location: { location: "   " },
      },
      scheduleHtml,
      verifiedAt,
      now,
    );
    expect(contest.location).toBe("대회별 공식 페이지 확인");
    expect(contest.mode).toBe("hybrid");
  });
});

describe("CTFtime source adapter", () => {
  it("normalizes valid upcoming events and maps restrictions conservatively", () => {
    const contests = normalizeCtftimePayload(
      [
        {
          id: 3372,
          title: "BushBash CTF",
          start: "2026-07-31T07:00:00+00:00",
          finish: "2026-08-02T07:00:00+00:00",
          ctftime_url: "https://ctftime.org/event/3372/",
          format: "Jeopardy",
          onsite: false,
          restrictions: "Open",
          organizers: [{ name: "CSSA" }],
        },
        {
          id: 3373,
          title: "Student CTF",
          start: "2026-08-03T07:00:00+00:00",
          finish: "2026-08-04T07:00:00+00:00",
          ctftime_url: "https://ctftime.org/event/3373/",
          format: "Jeopardy",
          onsite: true,
          location: "Seoul",
          restrictions: "Academic",
          organizers: [{ name: "University" }],
        },
      ],
      verifiedAt,
      now,
    );

    expect(contests).toHaveLength(2);
    expect(contests[0]).toMatchObject({
      id: "ctftime-3372",
      type: "security",
      mode: "online",
      eligibilities: ["anyone"],
      deadlineKind: "start",
    });
    expect(contests[1]).toMatchObject({
      mode: "offline",
      location: "Seoul",
      eligibilities: ["university"],
    });
  });

  it("skips malformed, expired, and out-of-range events", () => {
    const contests = normalizeCtftimePayload(
      [
        {
          id: 1,
          title: "Past",
          start: "2026-07-20T00:00:00Z",
          finish: "2026-07-21T00:00:00Z",
          ctftime_url: "https://ctftime.org/event/1/",
        },
        {
          id: 2,
          title: "Bad URL",
          start: "2026-08-01T00:00:00Z",
          finish: "2026-08-02T00:00:00Z",
          ctftime_url: "https://example.com/event/2",
        },
        {
          id: 3,
          title: "Delayed CTF - POSTPONED",
          start: "2026-08-01T00:00:00Z",
          finish: "2026-08-02T00:00:00Z",
          ctftime_url: "https://ctftime.org/event/3/",
        },
      ],
      verifiedAt,
      now,
    );
    expect(contests).toHaveLength(0);
  });
});

describe("itch.io source adapter", () => {
  it("normalizes upcoming game jams and rejects implausibly long events", () => {
    const html = `
      <div class="jam_grid_widget">
        <div class="jam lazy_images">
          <div class="primary_info"><h3><a href="/jam/brackeys-16">Brackeys Game Jam 2026.2</a></h3></div>
          <div class="hosted_by meta_row">Hosted by <a href="#">Brackeys</a>, <a href="#">AquaXV</a></div>
          <div class="timestmap meta_row"><strong>Starts in <span class="date_countdown">2026-08-23T10:00:00Z</span></strong> · Lasts <span class="date_duration">7 days</span></div>
        </div>
        <div class="jam lazy_images">
          <div class="primary_info"><h3><a href="/jam/ten-years">Ten Years</a></h3></div>
          <div class="hosted_by meta_row">Hosted by Someone</div>
          <div class="timestmap meta_row"><strong>Starts in <span class="date_countdown">2026-08-24T10:00:00Z</span></strong> · Lasts <span class="date_duration">10 years</span></div>
        </div>
      </div>`;

    const contests = normalizeItchJamsHtml(html, verifiedAt, now);
    expect(contests).toHaveLength(1);
    expect(contests[0]).toMatchObject({
      id: "itch-brackeys-16",
      type: "game",
      mode: "online",
      eligibilities: ["rules"],
      applicationDeadline: "2026-08-30T10:00:00.000Z",
      organizer: "Brackeys, AquaXV",
    });
  });
});
