import { readFile, writeFile } from "node:fs/promises";

const siteUrl = "https://codepes.kro.kr";
const dataUrl = new URL(
  "../src/data/competitions.generated.json",
  import.meta.url,
);
const sitemapUrl = new URL("../public/sitemap.xml", import.meta.url);

const escapeXml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const data = JSON.parse(await readFile(dataUrl, "utf8"));
const urls = [
  `  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${escapeXml(data.updatedAt)}</lastmod>
  </url>`,
  ...data.contests.map(
    (competition) => `  <url>
    <loc>${escapeXml(
      `${siteUrl}/contests/${encodeURIComponent(competition.id)}`,
    )}</loc>
    <lastmod>${escapeXml(competition.lastVerifiedAt)}</lastmod>
  </url>`,
  ),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;

await writeFile(sitemapUrl, sitemap, "utf8");
console.log(`사이트맵에 ${urls.length}개 URL을 저장했습니다.`);
