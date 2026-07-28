interface AssetsBinding {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  ASSETS: AssetsBinding;
}

const applySecurityHeaders = (headers: Headers) => {
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
      "script-src 'self'",
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
    const html = (await response.text()).replaceAll("__SITE_ORIGIN__", origin);
    const headers = applySecurityHeaders(new Headers(response.headers));
    headers.delete("content-length");
    headers.set(
      "Cache-Control",
      "public, max-age=0, must-revalidate, no-transform",
    );

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
