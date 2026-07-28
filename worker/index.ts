import generatedData from "../src/data/competitions.generated.json";
import {
  buildContestSeo,
  buildContestStructuredData,
  buildSitemapXml,
  getContestIdFromUrl,
} from "../src/lib/seo";
import type {
  Competition,
  CompetitionData,
} from "../src/types/competition";

interface AssetsBinding {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  ASSETS: AssetsBinding;
}

const appShellPath = "/app-shell.txt";
const competitionData = generatedData as CompetitionData;
const staticCspMeta =
  /\s*<meta\b(?=[^>]*\bhttp-equiv\s*=\s*["']Content-Security-Policy["'])[^>]*>/i;
const structuredDataScript =
  /<script\b(?=[^>]*\btype\s*=\s*["']application\/ld\+json["'])[^>]*>/i;
const pageRequestHeadersToRemove = [
  "if-match",
  "if-modified-since",
  "if-none-match",
  "if-range",
  "if-unmodified-since",
  "range",
];
const transformedResponseHeadersToRemove = [
  "accept-ranges",
  "content-disposition",
  "content-encoding",
  "content-length",
  "content-range",
  "etag",
  "last-modified",
];

const escapeHtmlAttribute = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const replaceSeoAttribute = (
  html: string,
  key: string,
  attribute: "content" | "href",
  value: string,
) =>
  html.replace(
    new RegExp(`<[^>]+data-seo=["']${key}["'][^>]*>`, "i"),
    (tag) =>
      tag.replace(
        new RegExp(`\\b${attribute}=(["'])[^"']*\\1`, "i"),
        `${attribute}="${escapeHtmlAttribute(value)}"`,
      ),
  );

const applyCompetitionMetadata = (
  html: string,
  competition: Competition,
) => {
  const seo = buildContestSeo(competition);
  let transformed = html.replace(
    /<title\b(?=[^>]*data-seo=["']title["'])[^>]*>[\s\S]*?<\/title>/i,
    `<title data-seo="title">${escapeHtmlAttribute(seo.title)}</title>`,
  );

  for (const [key, attribute, value] of [
    ["description", "content", seo.description],
    ["canonical", "href", seo.canonicalUrl],
    ["og-type", "content", "website"],
    ["og-title", "content", seo.title],
    ["og-description", "content", seo.description],
    ["og-url", "content", seo.canonicalUrl],
    ["twitter-title", "content", seo.title],
    ["twitter-description", "content", seo.description],
  ] as const) {
    transformed = replaceSeoAttribute(transformed, key, attribute, value);
  }

  const structuredData = JSON.stringify(
    buildContestStructuredData(competition),
  ).replaceAll("<", "\\u003c");
  return transformed.replace(
    /<script\b(?=[^>]*data-schema=["']website["'])[^>]*>[\s\S]*?<\/script>/i,
    `<script data-schema="website" type="application/ld+json">${structuredData}</script>`,
  );
};

const isPageRequest = (request: Request) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return false;
  }

  const { pathname } = new URL(request.url);
  const lastSegment = pathname.split("/").at(-1) ?? "";

  return (
    pathname === "/" ||
    (!lastSegment.includes(".") &&
      (request.headers.get("accept") ?? "").includes("text/html"))
  );
};

const applySecurityHeaders = (headers: Headers, scriptNonce?: string) => {
  const scriptPolicy = scriptNonce
    ? `script-src 'self' 'nonce-${scriptNonce}'`
    : "script-src 'self'";

  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  headers.set("X-Frame-Options", "DENY");
  headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      scriptPolicy,
      "style-src 'self'",
      "img-src 'self' data:",
      "connect-src 'self' https://raw.githubusercontent.com",
      "base-uri 'none'",
      "form-action 'self' https://github.com",
      "frame-ancestors 'none'",
    ].join("; "),
  );
  return headers;
};

const makePageAssetRequest = (url: URL | string, request: Request) => {
  const headers = new Headers(request.headers);

  for (const header of pageRequestHeadersToRemove) {
    headers.delete(header);
  }

  return new Request(url, { headers, method: "GET" });
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestUrl = new URL(request.url);
    if (
      requestUrl.pathname === "/sitemap.xml" &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      const sitemap = buildSitemapXml(
        competitionData.contests,
        competitionData.updatedAt,
      );
      const headers = applySecurityHeaders(
        new Headers({
          "Cache-Control": "public, max-age=3600",
          "Content-Type": "application/xml; charset=UTF-8",
        }),
      );
      return new Response(request.method === "HEAD" ? null : sitemap, {
        headers,
      });
    }

    const pageRequest = isPageRequest(request);
    const assetRequest = pageRequest
      ? makePageAssetRequest(new URL(appShellPath, request.url), request)
      : request;
    let response = await env.ASSETS.fetch(assetRequest);

    // The source index is still used by Vite's development server. Production
    // builds rename it to appShellPath so public navigations reach this Worker.
    if (pageRequest && response.status === 404) {
      response = await env.ASSETS.fetch(
        makePageAssetRequest(request.url, request),
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    const isHtml = pageRequest
      ? response.status === 200
      : contentType.includes("text/html");

    if (!isHtml) {
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: applySecurityHeaders(new Headers(response.headers)),
      });
    }

    const origin = requestUrl.origin;
    const contestId = getContestIdFromUrl(requestUrl);
    const competition = contestId
      ? competitionData.contests.find((item) => item.id === contestId)
      : undefined;
    const scriptNonce = crypto.randomUUID().replaceAll("-", "");
    let html = await response.text();
    if (competition) {
      html = applyCompetitionMetadata(html, competition);
    }
    html = html
      .replaceAll("__SITE_ORIGIN__", origin)
      .replace(staticCspMeta, "")
      .replace(
        structuredDataScript,
        (openingTag) =>
          `${openingTag.slice(0, -1)} nonce="${scriptNonce}">`,
      );
    const headers = applySecurityHeaders(
      new Headers(response.headers),
      scriptNonce,
    );
    for (const header of transformedResponseHeadersToRemove) {
      headers.delete(header);
    }
    headers.set("Cache-Control", "no-store");
    headers.set("Content-Type", "text/html; charset=UTF-8");

    const missingContest =
      requestUrl.pathname.startsWith("/contests/") &&
      contestId !== undefined &&
      competition === undefined;

    return new Response(request.method === "HEAD" ? null : html, {
      status: missingContest ? 404 : response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
