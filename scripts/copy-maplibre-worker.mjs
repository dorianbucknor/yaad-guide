// MapLibre's worker is served from /public because bundlers do not resolve it reliably.
// Runs before dev and build; the copied file is git-ignored.
import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("public", { recursive: true });
copyFileSync("node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", "public/maplibre-gl-worker.mjs");
