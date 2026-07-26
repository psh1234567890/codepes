import { describe, expect, it } from "vitest";
import worker from "./index";

const makeEnv = (response: Response) => ({
  ASSETS: {
    fetch: async () => response.clone(),
  },
});

describe("site worker", () => {
  it("resolves the public origin and adds security headers to HTML", async () => {
    const asset = new Response(
      '<meta property="og:image" content="__SITE_ORIGIN__/og.png">',
      {
        headers: {
          "content-length": "62",
          "content-type": "text/html; charset=UTF-8",
        },
      },
    );

    const response = await worker.fetch(
      new Request("https://codepes.example/"),
      makeEnv(asset),
    );
    const html = await response.text();

    expect(html).toContain("https://codepes.example/og.png");
    expect(html).not.toContain("__SITE_ORIGIN__");
    expect(response.headers.get("content-length")).toBeNull();
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("content-security-policy")).toContain(
      "connect-src 'self' https://raw.githubusercontent.com",
    );
  });

  it("adds security headers to static assets", async () => {
    const response = await worker.fetch(
      new Request("https://codepes.example/assets/app.js"),
      makeEnv(
        new Response("console.log('ok')", {
          headers: { "content-type": "text/javascript" },
        }),
      ),
    );

    expect(response.headers.get("referrer-policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(response.headers.get("permissions-policy")).toContain("camera=()");
  });
});
