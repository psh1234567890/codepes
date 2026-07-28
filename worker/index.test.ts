import { describe, expect, it } from "vitest";

import generatedData from "../src/data/competitions.generated.json";
import type { CompetitionData } from "../src/types/competition";
import worker from "./index";

const competitionData = generatedData as CompetitionData;
const sampleContest = competitionData.contests[0];
if (!sampleContest) {
  throw new Error("Worker tests require at least one generated contest.");
}

const makeEnv = (
  response: Response,
  onRequest: (request: Request) => void = () => undefined,
) => ({
  ASSETS: {
    fetch: async (request: Request) => {
      onRequest(request);
      return response.clone();
    },
  },
});

const assetHtml = `<!doctype html>
<html>
  <head>
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'"
    />
    <meta data-seo="description" name="description" content="default" />
    <link data-seo="canonical" rel="canonical" href="https://codepes.kro.kr/" />
    <meta data-seo="og-type" property="og:type" content="website" />
    <meta data-seo="og-title" property="og:title" content="default" />
    <meta data-seo="og-description" property="og:description" content="default" />
    <meta data-seo="og-url" property="og:url" content="https://codepes.kro.kr/" />
    <meta property="og:image" content="__SITE_ORIGIN__/og.png" />
    <meta data-seo="twitter-title" name="twitter:title" content="default" />
    <meta data-seo="twitter-description" name="twitter:description" content="default" />
    <script data-schema="website" type='application/ld+json'>{"url":"__SITE_ORIGIN__"}</script>
    <title data-seo="title">default</title>
  </head>
  <body></body>
</html>`;

describe("Sites worker security headers", () => {
  it.each(["/", "/calendar"])(
    "serves %s through the app shell with one request-specific nonce",
    async (path) => {
      let requestedAssetPath = "";
      let retainedConditionalHeader = "";
      const response = await worker.fetch(
        new Request(`https://codepes.kro.kr${path}`, {
          headers: {
            accept: "text/html",
            "if-none-match": '"old-shell"',
            range: "bytes=0-100",
          },
        }),
        makeEnv(
          new Response(assetHtml, {
            headers: {
              "accept-ranges": "bytes",
              "content-disposition": "inline",
              "content-encoding": "identity",
              "content-length": String(assetHtml.length),
              "content-type": "text/plain; charset=utf-8",
              etag: '"app-shell"',
              "last-modified": "Tue, 28 Jul 2026 00:00:00 GMT",
            },
          }),
          (request) => {
            requestedAssetPath = new URL(request.url).pathname;
            retainedConditionalHeader =
              request.headers.get("if-none-match") ??
              request.headers.get("range") ??
              "";
          },
        ),
      );

      const html = await response.text();
      const csp = response.headers.get("Content-Security-Policy") ?? "";
      const nonce = csp.match(/'nonce-([a-f0-9]{32})'/)?.[1];

      expect(response.status).toBe(200);
      expect(requestedAssetPath).toBe("/app-shell.txt");
      expect(retainedConditionalHeader).toBe("");
      expect(response.headers.get("content-type")).toBe(
        "text/html; charset=UTF-8",
      );
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("accept-ranges")).toBeNull();
      expect(response.headers.get("content-disposition")).toBeNull();
      expect(response.headers.get("content-encoding")).toBeNull();
      expect(response.headers.get("etag")).toBeNull();
      expect(response.headers.get("last-modified")).toBeNull();
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
    },
  );

  it("serves HEAD checks for the public root through the app shell", async () => {
    let requestedMethod = "";
    const response = await worker.fetch(
      new Request("https://codepes.kro.kr/", { method: "HEAD" }),
      makeEnv(
        new Response(assetHtml, {
          headers: { "content-type": "text/plain; charset=utf-8" },
        }),
        (request) => {
          requestedMethod = request.method;
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(requestedMethod).toBe("GET");
    expect(response.headers.get("content-security-policy")).toContain(
      "'nonce-",
    );
    expect(await response.text()).toBe("");
  });

  it("renders contest-specific metadata at a stable contest URL", async () => {
    const response = await worker.fetch(
      new Request(
        `https://codepes.kro.kr/contests/${sampleContest.id}`,
        {
          headers: { accept: "text/html" },
        },
      ),
      makeEnv(
        new Response(assetHtml, {
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      ),
    );

    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain(
      `<title data-seo="title">${sampleContest.title} 일정·참가 정보 | CodePes</title>`,
    );
    expect(html).toContain(
      `href="https://codepes.kro.kr/contests/${sampleContest.id}"`,
    );
    expect(html).toContain('"@type":"Event"');
    expect(html).toContain(`"name":${JSON.stringify(sampleContest.title)}`);
  });

  it("returns a sitemap containing the homepage and contest pages", async () => {
    const response = await worker.fetch(
      new Request("https://codepes.kro.kr/sitemap.xml"),
      makeEnv(new Response("unused")),
    );
    const xml = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "application/xml; charset=UTF-8",
    );
    expect(xml).toContain("<loc>https://codepes.kro.kr/</loc>");
    expect(xml).toContain(
      `<loc>https://codepes.kro.kr/contests/${sampleContest.id}</loc>`,
    );
  });

  it("adds security headers to static assets without an HTML nonce", async () => {
    let requestedAssetPath = "";
    const response = await worker.fetch(
      new Request("https://codepes.kro.kr/assets/app.js"),
      makeEnv(
        new Response("console.log('ok')", {
          headers: { "content-type": "text/javascript" },
        }),
        (request) => {
          requestedAssetPath = new URL(request.url).pathname;
        },
      ),
    );
    const csp = response.headers.get("content-security-policy") ?? "";

    expect(response.headers.get("referrer-policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(response.headers.get("permissions-policy")).toContain("camera=()");
    expect(requestedAssetPath).toBe("/assets/app.js");
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain("'nonce-");
  });
});
