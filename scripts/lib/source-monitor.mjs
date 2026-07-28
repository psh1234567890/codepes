import { createHash } from "node:crypto";

const decodeEntities = (value) =>
  value
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");

export const extractVisibleLines = (html) => {
  const text = decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|svg|noscript)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|tr|h[1-6]|section|article)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  );

  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
};

export const buildSourceFingerprint = (html) => {
  const lines = extractVisibleLines(html);
  const normalized = lines.join("\n").slice(0, 250_000);
  const markers = [
    ...new Set(
      lines.filter(
        (line) =>
          line.length <= 280 &&
          /(20\d{2}|대회|경진|contest|competition|접수|신청|모집|예선|본선)/i.test(
            line,
          ),
      ),
    ),
  ].slice(0, 40);

  return {
    fingerprint: createHash("sha256").update(normalized).digest("hex"),
    markers,
  };
};
