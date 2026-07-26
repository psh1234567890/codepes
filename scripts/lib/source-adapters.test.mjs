import { describe, expect, it } from "vitest";
import {
  extractDevpostSubmissionDates,
  normalizeAtCoderHtml,
  normalizeCodeChefPayload,
  normalizeDevpostHackathon,
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
});
