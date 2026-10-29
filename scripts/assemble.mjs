// Inlines the Vite bundle into one HTML file.
// - dist/masters-os.html          → page fragment for claude.ai Artifacts
//   (the Artifact host adds <!doctype>/<head>/<body> itself)
// - dist/masters-os-standalone.html → full document to open locally
import { readFileSync, writeFileSync } from "node:fs";

const js = readFileSync("dist/bundle/app.js", "utf8").replace(/<\/script/gi, "<\\/script");
const css = readFileSync("dist/bundle/app.css", "utf8");
const fonts =
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Schibsted+Grotesk:wght@600;700;800&display=swap">';
const head = `<title>Master's Application OS</title>
<meta name="claude:viewport-fit-sides" content="cover">
${fonts}
<style>${css}</style>`;
const body = `<div id="root"></div>
<script>${js}</script>`;

writeFileSync("dist/masters-os.html", `${head}\n${body}\n`);
writeFileSync(
  "dist/masters-os-standalone.html",
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">${head}</head><body>${body}</body></html>\n`,
);
console.log("Wrote dist/masters-os.html and dist/masters-os-standalone.html");
