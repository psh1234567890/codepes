import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { buildSourceFingerprint } from "./lib/source-monitor.mjs";

const USER_AGENT = "CodePes/0.1 (+competition directory source monitor)";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcesPath = path.join(root, "data", "sources.json");
const statePath = path.join(root, "data", "source-monitor-state.json");

const readJson = async (filePath, fallback) => {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
};

const sources = await readJson(sourcesPath, []);
const previous = await readJson(statePath, {});
const monitored = sources.filter(
  (source) => source.enabled && source.autoPublish === false,
);
const checkedAt = new Date().toISOString();

const results = await Promise.all(
  monitored.map(async (source) => {
    try {
      const response = await fetch(source.endpoint, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return {
        source,
        ...buildSourceFingerprint(await response.text()),
      };
    } catch (error) {
      console.warn(
        `[monitor] ${source.name}: ${
          error instanceof Error ? error.message : error
        }`,
      );
      return { source, error: true };
    }
  }),
);

const next = {};
let changedCount = 0;
let checkedCount = 0;

for (const result of results) {
  const existing = previous[result.source.id];
  if (result.error) {
    if (existing) next[result.source.id] = existing;
    continue;
  }

  checkedCount += 1;
  if (existing?.fingerprint === result.fingerprint) {
    next[result.source.id] = existing;
    continue;
  }

  changedCount += 1;
  next[result.source.id] = {
    name: result.source.name,
    endpoint: result.source.endpoint,
    fingerprint: result.fingerprint,
    markers: result.markers,
    lastChangedAt: checkedAt,
  };
  console.log(`[monitor] 변경 감지: ${result.source.name}`);
}

const activeIds = new Set(monitored.map((source) => source.id));
for (const [id, value] of Object.entries(previous)) {
  if (activeIds.has(id) && !next[id]) next[id] = value;
}

const serialized = `${JSON.stringify(next, null, 2)}\n`;
const previousSerialized = `${JSON.stringify(previous, null, 2)}\n`;
if (serialized !== previousSerialized) {
  await writeFile(statePath, serialized, "utf8");
}

console.log(
  `[monitor] ${checkedCount}/${monitored.length}개 출처 확인, ${changedCount}개 변경`,
);
