interface AssetsBinding {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  ASSETS: AssetsBinding;
}

const appShellPath = "/app-shell.txt";
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

    const origin = new URL(request.url).origin;
    const scriptNonce = crypto.randomUUID().replaceAll("-", "");
    const html = (await response.text())
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

    return new Response(request.method === "HEAD" ? null : html, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
