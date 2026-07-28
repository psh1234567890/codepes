import { describe, expect, it } from "vitest";
import {
  buildSourceFingerprint,
  extractVisibleLines,
} from "./source-monitor.mjs";

describe("source monitor", () => {
  it("keeps visible contest markers and ignores scripts", () => {
    const html = `
      <script>const changingClock = Date.now()</script>
      <h1>ACPC 2027</h1>
      <p>참가 신청은 6월 1일부터 시작합니다.</p>
      <style>.hidden { display: none }</style>
    `;

    expect(extractVisibleLines(html)).toEqual([
      "ACPC 2027",
      "참가 신청은 6월 1일부터 시작합니다.",
    ]);
    expect(buildSourceFingerprint(html).markers).toEqual([
      "ACPC 2027",
      "참가 신청은 6월 1일부터 시작합니다.",
    ]);
  });

  it("changes the fingerprint when an official schedule changes", () => {
    const before = buildSourceFingerprint(
      "<p>대회 접수 마감 2027년 6월 10일</p>",
    );
    const after = buildSourceFingerprint(
      "<p>대회 접수 마감 2027년 6월 17일</p>",
    );

    expect(before.fingerprint).not.toBe(after.fingerprint);
  });
});
