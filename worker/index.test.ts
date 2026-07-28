import { describe, expect, it } from "vitest";

import worker from "./index";

const makeEnv = (response: Response) => ({
  ASSETS: {
    fetch: async () => response.clone(),
  },
});

const assetHtml = `<!doctype html>
<html>
  <head>
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'"
    />
    <meta property="og:image" content="__SITE_ORIGIN__/og.png" />
    <script type="application/ld+json">{"url":"__SITE_ORIGIN__"}</script>
  </head>
  <body></body>
</html>`;

describe("Sites worker security headers", () => {
  it("uses one request-specific nonce for the CSP and inline structured data", async () => {
    const response = await worker.fetch(
      new Request("https://codepes.kro.kr/"),
      makeEnv(
        new Response(assetHtml, {
          headers: {
            "content-length": String(assetHtml.length),
            "content-type": "text/html; charset=utf-8",
          },
        }),
      ),
    );

    const html = await response.text();
    const csp = response.headers.get("Content-Security-Policy") ?? "";
    const nonce = csp.match(/'nonce-([a-f0-9]{32})'/)?.[1];

    expect(response.status).toBe(200);
    expect(nonce).toBeDefined();
    expect(csp).not.toContain("'unsafe-inline'");
    expect(html).not.toContain('http-equiv="Content-Security-Policy"');
    expect(html).toContain(`nonce="${nonce}"`);
    expect(html).toContain('{"url":"https://codepes.kro.kr"}');
    expect(html).toContain("https://codepes.kro.kr/og.png");
    expect(html).not.toContain("__SITE_ORIGIN__");
    expect(response.headers.has("content-length")).toBe(false);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(csp).toContain(
      "connect-src 'self' https://raw.githubusercontent.com",
    );
  });

  it("adds security headers to static assets without an HTML nonce", async () => {
    const response = await worker.fetch(
      new Request("https://codepes.kro.kr/assets/app.js"),
      makeEnv(
        new Response("console.log('ok')", {
          headers: { "content-type": "text/javascript" },
        }),
      ),
    );
    const csp = response.headers.get("content-security-policy") ?? "";

    expect(response.headers.get("referrer-policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(response.headers.get("permissions-policy")).toContain("camera=()");
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain("'nonce-");
  });
});
