const http = require("http");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const PORT = 8080;
const ROOT = __dirname;
const LOGOS_DIR = path.join(ROOT, "logos");

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};

// ── SSE clients for live reload ───────────────────────────────────────────────

const clients = new Set();

function broadcast() {
  for (const res of clients) {
    res.write("data: reload\n\n");
  }
}

// ── Run scan ──────────────────────────────────────────────────────────────────

function runScan() {
  try {
    execSync("node scan.js", { cwd: ROOT, stdio: "inherit" });
    broadcast();
  } catch { /* ignore */ }
}

// ── Watch logos/ folder ───────────────────────────────────────────────────────

let debounce;
fs.watch(LOGOS_DIR, (event, filename) => {
  if (!filename || !filename.toLowerCase().endsWith(".svg")) return;
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    console.log(`↺  ${filename} changed — rescanning…`);
    runScan();
  }, 200);
});

// ── HTTP server ───────────────────────────────────────────────────────────────

const RELOAD_SNIPPET = `<script>
  const es = new EventSource("/__reload");
  es.onmessage = () => location.reload();
</script>`;

const server = http.createServer((req, res) => {
  // SSE endpoint
  if (req.url === "/__reload") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(": connected\n\n");
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }

  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/" || urlPath === "") urlPath = "/index.html";

  const filePath = path.join(ROOT, urlPath);

  // Security: stay inside ROOT
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end();
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });

    // Inject live-reload snippet into HTML
    if (ext === ".html") {
      res.end(data.toString().replace("</body>", `${RELOAD_SNIPPET}\n</body>`));
    } else {
      res.end(data);
    }
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────

runScan();
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n✗ Port ${PORT} is already in use.`);
    console.error(`  Stop the other server first, then run npm run dev again.\n`);
    process.exit(1);
  } else {
    throw err;
  }
});
server.listen(PORT, () => {
  console.log(`\n✓ Logolo dev server running at http://localhost:${PORT}/\n`);
  console.log("  Drop SVGs into logos/ — the browser will refresh automatically.\n");
});
