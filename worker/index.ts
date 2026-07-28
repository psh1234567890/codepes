interface AssetsBinding {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  ASSETS: AssetsBinding;
}

const staticCspMeta =
  /\s*<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?\/>/i;

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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const response = await env.ASSETS.fetch(request);
    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.includes("text/html")) {
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
        '<script type="application/ld+json">',
        `<script type="application/ld+json" nonce="${scriptNonce}">`,
      );
    const headers = applySecurityHeaders(
      new Headers(response.headers),
      scriptNonce,
    );
    headers.delete("content-length");

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
