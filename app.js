// ── Icons ─────────────────────────────────────────────────────────────────────

const COPY_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const DOWN_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
const CHECK_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

// ── DOM refs ──────────────────────────────────────────────────────────────────

const grid = document.getElementById("logoGrid");
const searchInput = document.getElementById("searchInput");
const emptyState = document.getElementById("emptyState");
const asciiAnim = document.getElementById("asciiAnim");
const searchQueryEl = document.getElementById("searchQuery");
const lightBtn = document.getElementById("lightBtn");
const darkBtn = document.getElementById("darkBtn");
const downloadAllBtn = document.getElementById("downloadAllBtn");
const openFigmaBtn = document.getElementById("openFigmaBtn");
const toast = document.getElementById("toast");
const multiselectBar = document.getElementById("multiselectBar");
const multiselectLabel = document.getElementById("multiselectLabel");
const multiselectDownload = document.getElementById("multiselectDownload");
const multiselectClear = document.getElementById("multiselectClear");

// ── Init ──────────────────────────────────────────────────────────────────────

let logos = [];

const savedTheme = localStorage.getItem("logolo-theme");
const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
applyTheme(savedTheme || (systemDark ? "dark" : "light"));

// Set your Figma file URL here once ready
const FIGMA_URL = "";

async function init() {
  try {
    const res = await fetch("logos.json");
    const data = await res.json();
    logos = data.logos || [];
    if (data.lastUpdated) {
      const d = new Date(data.lastUpdated);
      document.getElementById("footerUpdated").textContent =
        `Updated: ${d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
    }
  } catch {
    logos = [];
  }
  searchInput.placeholder = `Search ${logos.length} SVG logos...`;
  renderGrid(logos);
}

init();

// ── Theme ─────────────────────────────────────────────────────────────────────

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  lightBtn.classList.toggle("active", theme === "light");
  darkBtn.classList.toggle("active", theme === "dark");
  localStorage.setItem("logolo-theme", theme);
}

lightBtn.addEventListener("click", () => applyTheme("light"));
darkBtn.addEventListener("click", () => applyTheme("dark"));

// ── ASCII animation ───────────────────────────────────────────────────────────

// ── Rain animation ────────────────────────────────────────────────────────────

const RAIN_ROWS = 8;
const RAIN_COLS = 13;
const RAIN_GAP  = 2;
const RAIN_TRAIL = ['│', '╎', '·'];

const drops = Array.from({ length: RAIN_COLS }, () => ({
  y:       -Math.floor(Math.random() * (RAIN_ROWS + RAIN_TRAIL.length)),
  speed:   Math.random() < 0.35 ? 2 : 1,
  counter: 0,
}));

function renderRain() {
  const width = RAIN_COLS * RAIN_GAP;
  const grid  = Array.from({ length: RAIN_ROWS }, () => Array(width).fill(' '));

  drops.forEach((drop, d) => {
    const x = d * RAIN_GAP;
    RAIN_TRAIL.forEach((char, t) => {
      const row = drop.y - t;
      if (row >= 0 && row < RAIN_ROWS) grid[row][x] = char;
    });
  });

  return grid.map(row => row.join('')).join('\n');
}

function tickRain() {
  drops.forEach(drop => {
    drop.counter++;
    if (drop.counter >= drop.speed) {
      drop.counter = 0;
      drop.y++;
      if (drop.y - RAIN_TRAIL.length >= RAIN_ROWS) {
        drop.y     = -RAIN_TRAIL.length - Math.floor(Math.random() * 4);
        drop.speed = Math.random() < 0.35 ? 2 : 1;
      }
    }
  });
  asciiAnim.textContent = renderRain();
}

let animInterval = null;

function startAnim() {
  asciiAnim.style.opacity = "1";
  asciiAnim.textContent = renderRain();
  animInterval = setInterval(tickRain, 130);
}

function stopAnim() {
  clearInterval(animInterval);
  animInterval = null;
}

window.addEventListener("beforeunload", stopAnim);

// ── Multiselect ───────────────────────────────────────────────────────────────

const selectedFiles = new Set();
let lastClickIndex = -1;

function handleCardClick(e, card, index) {
  if (e.target.closest(".card-actions")) return;
  const file = card.dataset.file;

  if (e.shiftKey && lastClickIndex !== -1) {
    const cards = [...grid.querySelectorAll(".card")];
    const start = Math.min(lastClickIndex, index);
    const end   = Math.max(lastClickIndex, index);
    for (let i = start; i <= end; i++) selectedFiles.add(cards[i].dataset.file);
  } else {
    selectedFiles.has(file) ? selectedFiles.delete(file) : selectedFiles.add(file);
    lastClickIndex = index;
  }

  updateSelectionUI();
}

function updateSelectionUI() {
  grid.querySelectorAll(".card").forEach(card => {
    card.classList.toggle("selected", selectedFiles.has(card.dataset.file));
  });
  const count = selectedFiles.size;
  multiselectBar.classList.toggle("visible", count > 0);
  multiselectLabel.textContent = `Download ${count} logo${count !== 1 ? "s" : ""}`;
}

function clearSelection() {
  selectedFiles.clear();
  lastClickIndex = -1;
  updateSelectionUI();
}

multiselectClear.addEventListener("click", clearSelection);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") clearSelection();
});

multiselectDownload.addEventListener("click", async () => {
  if (typeof JSZip === "undefined") { showToast("JSZip failed to load"); return; }
  const files = [...selectedFiles];
  const zip = new JSZip();
  const folder = zip.folder("logolo-logos");
  let count = 0;
  await Promise.allSettled(files.map(async file => {
    try {
      const res = await fetch(`logos/${encodeURIComponent(file)}`);
      if (res.ok) { folder.file(file, await res.blob()); count++; }
    } catch { /* skip */ }
  }));
  if (count > 0) {
    const blob = await zip.generateAsync({ type: "blob" });
    triggerDownload(URL.createObjectURL(blob), "logolo-logos.zip", true);
    showToast(`Downloaded ${count} logo${count !== 1 ? "s" : ""}`);
    clearSelection();
  }
});

// ── Search ────────────────────────────────────────────────────────────────────

searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim().toLowerCase();
  const filtered = q ? logos.filter(l => l.name.toLowerCase().includes(q)) : logos;
  renderGrid(filtered);
  if (filtered.length === 0) {
    searchQueryEl.textContent = searchInput.value.trim();
    emptyState.classList.remove("hidden");
    startAnim();
  } else {
    emptyState.classList.add("hidden");
    stopAnim();
  }
});

// ── Render ────────────────────────────────────────────────────────────────────

function renderGrid(items) {
  lastClickIndex = -1;
  grid.innerHTML = items.map(logo => `
    <div class="card" data-file="${logo.file}" data-name="${escHtml(logo.name)}">
      <div class="card-body">
        <div class="card-logo">
          <img src="logos/${encodeURIComponent(logo.file)}" alt="${escHtml(logo.name)}" onerror="this.style.opacity='0.1'">
        </div>
        <div class="card-name">${escHtml(logo.name)}</div>
      </div>
      <div class="card-actions">
        <button class="card-btn copy-btn" data-tooltip="Copy SVG" aria-label="Copy ${escHtml(logo.name)} SVG">${COPY_ICON}</button>
        <button class="card-btn dl-btn" data-tooltip="Download SVG" aria-label="Download ${escHtml(logo.name)} SVG">${DOWN_ICON}</button>
      </div>
    </div>
  `).join("");

  grid.querySelectorAll(".card").forEach((card, i) => {
    card.addEventListener("click", (e) => handleCardClick(e, card, i));
  });
  grid.querySelectorAll(".copy-btn").forEach(btn =>
    btn.addEventListener("click", (e) => { e.stopPropagation(); copySvg(btn.closest(".card")); })
  );
  grid.querySelectorAll(".dl-btn").forEach(btn =>
    btn.addEventListener("click", (e) => { e.stopPropagation(); downloadSvg(btn.closest(".card")); })
  );

  updateSelectionUI();
}

function escHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Copy SVG ──────────────────────────────────────────────────────────────────

async function copySvg(card) {
  const file = card.dataset.file;
  try {
    const res = await fetch(`logos/${encodeURIComponent(file)}`);
    if (!res.ok) throw new Error("not found");
    const text = await res.text();
    await navigator.clipboard.writeText(text);
    showToast("SVG copied to clipboard");
    const btn = card.querySelector(".copy-btn");
    btn.innerHTML = CHECK_ICON;
    setTimeout(() => { btn.innerHTML = COPY_ICON; }, 1600);
  } catch {
    showToast("Serve the site over HTTP to enable copy");
  }
}

// ── Download SVG ──────────────────────────────────────────────────────────────

async function downloadSvg(card) {
  const { file } = card.dataset;
  try {
    const res = await fetch(`logos/${encodeURIComponent(file)}`);
    if (!res.ok) throw new Error("not found");
    const blob = await res.blob();
    triggerDownload(URL.createObjectURL(blob), file, true);
  } catch {
    triggerDownload(`logos/${encodeURIComponent(file)}`, file, false);
  }
}

function triggerDownload(href, filename, revoke) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (revoke) setTimeout(() => URL.revokeObjectURL(href), 10000);
}

// ── Download all ──────────────────────────────────────────────────────────────

downloadAllBtn.addEventListener("click", async () => {
  if (typeof JSZip === "undefined") {
    showToast("JSZip failed to load — check your connection");
    return;
  }

  const original = downloadAllBtn.innerHTML;
  downloadAllBtn.disabled = true;
  downloadAllBtn.textContent = "Preparing…";

  const zip = new JSZip();
  const folder = zip.folder("logolo-logos");
  let count = 0;

  await Promise.allSettled(logos.map(async logo => {
    try {
      const res = await fetch(`logos/${encodeURIComponent(logo.file)}`);
      if (res.ok) {
        folder.file(logo.file, await res.blob());
        count++;
      }
    } catch { /* skip missing files */ }
  }));

  if (count === 0) {
    showToast("No logos found to download");
  } else {
    const blob = await zip.generateAsync({ type: "blob" });
    triggerDownload(URL.createObjectURL(blob), "logolo-logos.zip", true);
    showToast(`Downloaded ${count} logo${count !== 1 ? "s" : ""}`);
  }

  downloadAllBtn.disabled = false;
  downloadAllBtn.innerHTML = original;
});

// ── Open in Figma ─────────────────────────────────────────────────────────────

openFigmaBtn.addEventListener("click", () => {
  if (!FIGMA_URL) {
    showToast("Figma link coming soon");
    return;
  }
  window.open(FIGMA_URL, "_blank", "noopener");
});

// ── Tooltip ───────────────────────────────────────────────────────────────────

const tooltipEl = document.createElement("div");
tooltipEl.className = "tooltip";
document.body.appendChild(tooltipEl);

let tooltipDelay;

grid.addEventListener("mouseover", (e) => {
  const btn = e.target.closest("[data-tooltip]");
  if (!btn) return;
  clearTimeout(tooltipDelay);
  tooltipDelay = setTimeout(() => {
    const rect = btn.getBoundingClientRect();
    tooltipEl.textContent = btn.dataset.tooltip;
    tooltipEl.style.left = `${rect.left + rect.width / 2}px`;
    tooltipEl.style.top = `${rect.top - 26}px`;
    tooltipEl.classList.add("show");
  }, 500);
});

grid.addEventListener("mouseout", (e) => {
  if (!e.target.closest("[data-tooltip]")) return;
  clearTimeout(tooltipDelay);
  tooltipEl.classList.remove("show");
});

// ── Toast ─────────────────────────────────────────────────────────────────────

let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}
