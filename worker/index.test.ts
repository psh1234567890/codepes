import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import generatedData from "../src/data/competitions.generated.json";
import type { CompetitionData } from "../src/types/competition";
import { REMOTE_DATA_URL } from "../src/config";
import { createWorker } from "./index";

const competitionData = generatedData as CompetitionData;
const sampleContest = competitionData.contests[0];
if (!sampleContest) {
  throw new Error("Worker tests require at least one generated contest.");
}

let worker: ReturnType<typeof createWorker>;
beforeEach(() => {
  worker = createWorker(vi.fn().mockRejectedValue(new Error("offline")));
});
afterEach(() => {
  vi.useRealTimers();
});

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
  it("replaces Vite script and style nonce placeholders for each request", async () => {
    const html = assetHtml.replace("</head>", '<meta property="csp-nonce" nonce="__CODEPES_CSP_NONCE__"><script type="module" nonce="__CODEPES_CSP_NONCE__">/* vite preamble */</script></head>');
    const response = await worker.fetch(new Request("https://codepes.kro.kr/"), makeEnv(new Response(html)));
    const csp = response.headers.get("content-security-policy") ?? "";
    const nonce = csp.match(/'nonce-([a-f0-9]{32})'/)?.[1];
    expect(nonce).toBeDefined();
    expect(csp).toContain(`style-src 'self' 'nonce-${nonce}'`);
    const result = await response.text();
    expect(result).not.toContain("__CODEPES_CSP_NONCE__");
    expect(result).toContain(`<script type="module" nonce="${nonce}">`);
  });
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

describe("current contest metadata and sitemap", () => {
  const bundledUpdatedAt = Date.parse(competitionData.updatedAt);
  const remoteUpdatedAt = new Date(bundledUpdatedAt + 1_000).toISOString();
  const remoteContest = {
    ...sampleContest,
    id: "new-contest-after-deploy",
    title: "New contest published after deployment",
    url: "https://example.com/new-contest",
  };
  const remoteData = {
    ...competitionData,
    updatedAt: remoteUpdatedAt,
    contests: [remoteContest],
  };
  const pageRequest = () => new Request(
    `https://codepes.kro.kr/contests/${remoteContest.id}`,
    { headers: { accept: "text/html" } },
  );
  const pageEnv = () => makeEnv(new Response(assetHtml));

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(bundledUpdatedAt + 60_000));
  });

  it("serves newly collected contest links and lists them in the sitemap", async () => {
    const fetchData = vi.fn().mockResolvedValue(Response.json(remoteData));
    worker = createWorker(fetchData);
    const response = await worker.fetch(pageRequest(), pageEnv());
    expect(response.status).toBe(200);
    expect(await response.text()).toContain(remoteContest.title);

    const sitemap = await worker.fetch(
      new Request("https://codepes.kro.kr/sitemap.xml"), pageEnv(),
    );
    expect(await sitemap.text()).toContain(`/contests/${remoteContest.id}`);
    expect(sitemap.headers.get("cache-control")).toBe("public, max-age=300");
    expect(fetchData).toHaveBeenCalledTimes(1);
    expect(fetchData.mock.calls[0][0]).toBe(REMOTE_DATA_URL);
  });

  it("reuses cached data while generating a different nonce for each page", async () => {
    const fetchData = vi.fn().mockResolvedValue(Response.json(remoteData));
    worker = createWorker(fetchData);
    const first = await worker.fetch(pageRequest(), pageEnv());
    const second = await worker.fetch(pageRequest(), pageEnv());
    expect(fetchData).toHaveBeenCalledTimes(1);
    expect(first.headers.get("content-security-policy")).not.toBe(
      second.headers.get("content-security-policy"),
    );
  });

  it("keeps replacement tokens and markup in source titles as literal text", async () => {
    const title = "Contest $& $` $' <img src=x>";
    const data = { ...remoteData, contests: [{ ...remoteContest, title }] };
    worker = createWorker(vi.fn().mockResolvedValue(Response.json(data)));
    const response = await worker.fetch(pageRequest(), pageEnv());
    const html = await response.text();
    expect(html).toContain("Contest $&amp; $` $' &lt;img src=x&gt;");
    expect(html).not.toContain("<img src=x>");
    expect(html.match(/<title\b/g)).toHaveLength(1);
    const structuredData = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)?.[1];
    expect(JSON.parse(structuredData ?? "{}")["@graph"][1].name).toBe(title);
  });

  it("coalesces concurrent cache misses", async () => {
    const fetchData = vi.fn().mockImplementation(async () => Response.json(remoteData));
    worker = createWorker(fetchData);
    const responses = await Promise.all([
      worker.fetch(pageRequest(), pageEnv()),
      worker.fetch(pageRequest(), pageEnv()),
      worker.fetch(new Request("https://codepes.kro.kr/sitemap.xml"), pageEnv()),
    ]);
    expect(responses.map((response) => response.status)).toEqual([200, 200, 200]);
    expect(fetchData).toHaveBeenCalledTimes(1);
  });

  it("retains last good remote data and backs off when a refresh fails", async () => {
    const fetchData = vi.fn()
      .mockResolvedValueOnce(Response.json(remoteData))
      .mockRejectedValue(new Error("GitHub unavailable"));
    worker = createWorker(fetchData);
    await worker.fetch(pageRequest(), pageEnv());
    vi.advanceTimersByTime(5 * 60_000);
    const response = await worker.fetch(pageRequest(), pageEnv());
    expect(response.status).toBe(200);
    expect(await response.text()).toContain(remoteContest.title);
    await worker.fetch(pageRequest(), pageEnv());
    expect(fetchData).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(60_000);
    await worker.fetch(pageRequest(), pageEnv());
    expect(fetchData).toHaveBeenCalledTimes(3);
  });

  it.each([
    { ...remoteData, contests: [{ ...remoteContest, url: "javascript:alert(1)" }] },
    { ...remoteData, updatedAt: "2020-01-01T00:00:00.000Z" },
    { ...remoteData, updatedAt: "2099-01-01T00:00:00.000Z" },
  ])("falls back to bundled data for an invalid, stale or future snapshot", async (data) => {
    worker = createWorker(vi.fn().mockResolvedValue(Response.json(data)));
    const response = await worker.fetch(
      new Request("https://codepes.kro.kr/sitemap.xml"), pageEnv(),
    );
    const sitemap = await response.text();
    expect(sitemap).toContain(`/contests/${sampleContest.id}`);
    expect(sitemap).not.toContain(`/contests/${remoteContest.id}`);
  });

  it("aborts a stalled upstream request and serves the bundled sitemap", async () => {
    const fetchData = vi.fn().mockImplementation((_url, options) =>
      new Promise((_resolve, reject) => {
        options.signal.addEventListener("abort", () => reject(new Error("aborted")));
      }),
    );
    worker = createWorker(fetchData);
    const pending = worker.fetch(
      new Request("https://codepes.kro.kr/sitemap.xml"), pageEnv(),
    );
    await vi.advanceTimersByTimeAsync(3_000);
    const response = await pending;
    expect(response.status).toBe(200);
    expect(await response.text()).toContain(`/contests/${sampleContest.id}`);
  });

  it("does not fetch remote data for the homepage or static assets", async () => {
    const fetchData = vi.fn();
    worker = createWorker(fetchData);
    await worker.fetch(new Request("https://codepes.kro.kr/"), pageEnv());
    await worker.fetch(
      new Request("https://codepes.kro.kr/assets/app.js"),
      makeEnv(new Response("export {};", { headers: { "content-type": "text/javascript" } })),
    );
    expect(fetchData).not.toHaveBeenCalled();
  });
});
