import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const siteUrl = "https://codepes.kro.kr";

describe("public site metadata", () => {
  it("uses deploy-safe absolute social images and a static CSP fallback", async () => {
    const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

    expect(html).not.toContain("__SITE_ORIGIN__");
    expect(html).toContain(`${siteUrl}/og.png`);
    expect(html).toContain(
      'rel="icon" type="image/svg+xml" href="/favicon.svg"',
    );
    expect(html).toContain('rel="shortcut icon" href="/favicon.svg"');
    expect(html).toContain('http-equiv="Content-Security-Policy"');
    expect(html).toContain(
      "connect-src 'self' https://raw.githubusercontent.com",
    );
  });

  it("provides static-host security headers", async () => {
    const headers = await readFile(
      new URL("../public/_headers", import.meta.url),
      "utf8",
    );

    expect(headers).toContain("X-Content-Type-Options: nosniff");
    expect(headers).toContain("X-Frame-Options: DENY");
    expect(headers).toContain("Content-Security-Policy:");
  });

  it("ships the favicon asset used by the page", async () => {
    const favicon = await readFile(
      new URL("../public/favicon.svg", import.meta.url),
      "utf8",
    );

    expect(favicon).toContain("<svg");
  });
});
