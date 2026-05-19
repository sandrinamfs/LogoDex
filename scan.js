const fs = require("fs");
const path = require("path");

const logosDir = path.join(__dirname, "logos");
const outputFile = path.join(__dirname, "logos.json");

const files = fs.readdirSync(logosDir)
  .filter(f => f.toLowerCase().endsWith(".svg"))
  .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

let latest = new Date(0);

const logos = files.map(file => {
  const stat = fs.statSync(path.join(logosDir, file));
  if (stat.mtime > latest) latest = stat.mtime;
  const name = path.basename(file, ".svg").replace(/[-_]/g, " ");
  return { name, file };
});

const output = { lastUpdated: latest.toISOString(), logos };
fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
console.log(`✓ ${logos.length} logos scanned → logos.json (last modified: ${latest.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })})`);
