import { describe, expect, it } from "vitest";
import {
  extractDevpostSubmissionDates,
  extractKitpaContestDetailUrl,
  extractKoiGuideLinks,
  getDevpostKoreanOnlineEvidence,
  normalizeAtCoderHtml,
  normalizeCodeChefPayload,
  normalizeCtftimePayload,
  normalizeDevpostHackathon,
  normalizeItchJamsHtml,
  normalizeKitpaYouthContestHtml,
  normalizeKoiGuideHtml,
  normalizeKookminAlgorithmHtml,
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

describe("Korean official contest source adapters", () => {
  it("discovers KOI round guides and publishes only an open official round", () => {
    expect(
      extractKoiGuideLinks(`
        <a href="/koi/2027/1/">1차</a>
        <a href="/koi/2027/2/">2차</a>
        <a href="/koi/2027/2/">중복</a>
      `),
    ).toEqual([
      "https://koi.or.kr/koi/2027/1/",
      "https://koi.or.kr/koi/2027/2/",
    ]);

    const contest = normalizeKoiGuideHtml(
      `
        <title>2027년도 한국정보올림피아드 1차 대회 안내사항</title>
        <table>
          <tr><td>접수</td><td>3/10(수) 10:00 - 4/20(화) 23:59</td></tr>
          <tr><td>대회 개최</td><td>5/9(일) 13:00 - 17:00</td></tr>
        </table>
        <p>1차 대회는 온라인으로 개최됩니다.</p>
      `,
      "https://koi.or.kr/koi/2027/1/",
      verifiedAt,
      now,
    );

    expect(contest).toMatchObject({
      id: "koi-2027-1",
      mode: "online",
      eligibilities: ["youth"],
      applicationDeadline: "2027-04-20T14:59:00.000Z",
      eventStart: "2027-05-09T04:00:00.000Z",
      eventEnd: "2027-05-09T08:00:00.000Z",
    });

    expect(
      normalizeKoiGuideHtml(
        `
          <h1>2026년도 한국정보올림피아드 2차 대회</h1>
          <p>접수 6/26(금) 10:00 - 7/12(일) 23:59</p>
          <p>대회 개최 7/18(토) 12:30 - 18:00</p>
          <p>온라인으로 개최됩니다.</p>
        `,
        "https://koi.or.kr/koi/2026/2/",
        verifiedAt,
        now,
      ),
    ).toBeUndefined();
  });

  it("discovers and normalizes the latest open KITPA youth contest", () => {
    expect(
      extractKitpaContestDetailUrl(`
        <a href="/contest/4">4회</a>
        <a href="/contest/7">현재 회차</a>
        <a href="/contest/6">6회</a>
      `),
    ).toBe("https://kitpa.org/contest/7");

    const contest = normalizeKitpaYouthContestHtml(
      `
        <h2>2027 제7회 청소년 IT경시대회</h2>
        <p>추가접수기간: 3월 8일 (월) ~ 3월 11일 (목) 18:00</p>
        <p>3월 13일 온라인 수험장 주소 확인 및 수험표 출력</p>
        <div>3월 15일 (토): 대회 개최
          <p>프로그래밍 언어 부문 - 시험 9:30 ~ 11:00</p>
          <p>알고리즘 부문 - 시험 14:30 ~ 18:00</p>
        </div>
        <p>3월 20일 가채점 결과 발표</p>
      `,
      "https://kitpa.org/contest/7",
      verifiedAt,
      now,
    );

    expect(contest).toMatchObject({
      id: "kitpa-youth-it-2027-7",
      mode: "online",
      applicationDeadline: "2027-03-11T09:00:00.000Z",
      eventStart: "2027-03-15T00:30:00.000Z",
      eventEnd: "2027-03-15T09:00:00.000Z",
    });
  });

  it("normalizes an open Kookmin University algorithm contest", () => {
    const contest = normalizeKookminAlgorithmHtml(
      `
        <p>제12회 국민대학교 알고리즘 대회</p>
        <p>참가 자격 고등학교 재학생 및 졸업생</p>
        <table>
          <tr><td>지원서 접수</td><td>2027.06.21.(월) 10:00 ~ 06.24.(목) 16:00</td></tr>
          <tr><td>대회</td><td>2027.07.22.(목) 14:00~16:00</td><td>대면 시험 진행(본교 고사장)</td></tr>
        </table>
      `,
      "https://software.kookmin.ac.kr/software/biz/algorism.do",
      verifiedAt,
      now,
    );

    expect(contest).toMatchObject({
      id: "kookmin-algorithm-2027",
      title: "제12회 국민대학교 알고리즘 대회",
      mode: "offline",
      applicationDeadline: "2027-06-24T07:00:00.000Z",
      eventStart: "2027-07-22T05:00:00.000Z",
      eventEnd: "2027-07-22T07:00:00.000Z",
    });
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
  const globalRulesHtml = `
    <main>
      <h2>Eligibility</h2>
      <p>Participation is open worldwide. Participants must follow all local laws.</p>
    </main>`;

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
      globalRulesHtml,
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
        globalRulesHtml,
        verifiedAt,
        now,
      ),
    ).toBeUndefined();
  });

  it("does not publish a hackathon without confirmed online participation", () => {
    expect(
      normalizeDevpostHackathon(
      {
        id: 29542,
        title: "Location Pending",
        url: "https://location-pending.devpost.com/",
        invite_only: false,
        displayed_location: { location: "   " },
      },
      scheduleHtml,
      globalRulesHtml,
      verifiedAt,
      now,
      ),
    ).toBeUndefined();
  });

  it("requires positive geographic evidence in the official rules", () => {
    const hackathon = {
      displayed_location: { location: "Online" },
    };
    expect(
      getDevpostKoreanOnlineEvidence(
        hackathon,
        "<main>Eligibility: Open to local university students.</main>",
      ),
    ).toBeUndefined();
    expect(
      getDevpostKoreanOnlineEvidence(
        hackathon,
        "<main>Participants from any location are welcome.</main>",
      ),
    ).toBe("공식 규정에 전 세계 온라인 참가 가능 명시");
    expect(
      getDevpostKoreanOnlineEvidence(
        hackathon,
        "<main>Residents of South Korea are not eligible.</main>",
      ),
    ).toBeUndefined();
  });
});

describe("CTFtime source adapter", () => {
  it("publishes only online events explicitly marked Open", () => {
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

    expect(contests).toHaveLength(1);
    expect(contests[0]).toMatchObject({
      id: "ctftime-3372",
      type: "security",
      mode: "online",
      eligibilities: ["anyone"],
      deadlineKind: "start",
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
