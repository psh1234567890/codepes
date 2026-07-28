import { copyFile, mkdir, rename } from "node:fs/promises";

const outputDirectory = new URL("../dist/.openai/", import.meta.url);
const clientDirectory = new URL("../dist/client/", import.meta.url);

await mkdir(outputDirectory, { recursive: true });
await copyFile(
  new URL("../.openai/hosting.json", import.meta.url),
  new URL("hosting.json", outputDirectory),
);
await rename(
  new URL("index.html", clientDirectory),
  new URL("app-shell.txt", clientDirectory),
);
