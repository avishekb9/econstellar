#!/usr/bin/env node
/* gen-man.mjs — OS-P4: generate the method manual FROM the live catalog.
   K5: the catalog is the truth — zero hand-written method docs. Re-run this
   after any engine deploy that changes /api/compute/catalog.

     node scripts/gen-man.mjs            # fetch live catalog → man/*.html
     CATALOG_FILE=path node scripts/...  # offline/test mode

   Honesty rules: paper == null renders "none — honest"; composes_with is not
   yet a catalog field (Pathway F) and is rendered as pending, never invented. */
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ENGINE = process.env.ENGINE_URL || "https://shssm-compute-b7ui3oxaqq-el.a.run.app";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "man");
mkdirSync(OUT, { recursive: true });

const cat = process.env.CATALOG_FILE
  ? JSON.parse(readFileSync(process.env.CATALOG_FILE, "utf8"))
  : await fetch(`${ENGINE}/api/compute/catalog`, { signal: AbortSignal.timeout(20000) }).then(r => r.json());

const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const PAGE = (title, body) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · Econstellar method manual</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Orbitron:wght@700;900&display=swap');
:root{--bg:#000;--surface:rgba(8,10,14,.92);--border:rgba(0,212,255,.15);--rule:rgba(255,255,255,.06);--text:#fff;--mid:#c9d1d9;--dim:#6b7280;--cyan:#00d4ff;--green:#00ff88;--amber:#f59e0b;--mono:'JetBrains Mono',monospace;--disp:'Orbitron',sans-serif}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:'Space Grotesk',sans-serif;line-height:1.55}
a{color:var(--cyan);text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:880px;margin:0 auto;padding:0 20px}
nav{display:flex;gap:1rem;align-items:center;padding:.9rem 20px;border-bottom:1px solid var(--rule);font-family:var(--mono);font-size:.78rem;background:rgba(0,0,0,.7)}
nav .brand{color:var(--green);font-weight:600}nav .sp{flex:1}nav a{color:var(--dim)}
h1{font-family:var(--disp);font-size:1.6rem;margin:1.6rem 0 .2rem}
.cat{font-family:var(--mono);font-size:.72rem;color:var(--cyan);text-transform:uppercase;letter-spacing:1.5px}
.desc{color:var(--mid);max-width:74ch}
h2{font-family:var(--disp);font-size:.95rem;margin:1.6rem 0 .5rem;color:var(--green)}
table{border-collapse:collapse;width:100%;font-size:.84rem}
td,th{padding:.4rem .7rem;border-bottom:1px solid var(--rule);text-align:left;color:var(--mid)}
th{font-family:var(--mono);font-size:.62rem;text-transform:uppercase;letter-spacing:1px;color:var(--dim)}
td.mono,code{font-family:var(--mono);font-size:.8rem}
.chips{display:flex;flex-wrap:wrap;gap:.4rem}
.chip{font-family:var(--mono);font-size:.72rem;border:1px solid var(--border);border-radius:7px;padding:.25rem .55rem;color:var(--mid)}
pre{background:rgba(12,18,28,.92);border:1px solid var(--border);border-radius:10px;padding:1rem;overflow-x:auto;font-family:var(--mono);font-size:.76rem;color:var(--mid)}
.kv{font-family:var(--mono);font-size:.8rem;color:var(--mid)}.kv b{color:#fff}
.none{color:var(--amber);font-family:var(--mono);font-size:.8rem}
.foot{font-family:var(--mono);font-size:.72rem;color:var(--dim);border-top:1px solid var(--rule);margin-top:2.2rem;padding:1.2rem 0 2.4rem;line-height:1.8}
.os-kbtn{font-family:var(--mono);font-size:.7rem;background:none;border:1px solid rgba(0,212,255,.25);color:var(--cyan);border-radius:6px;cursor:pointer;padding:.1rem .5rem}
</style></head>
<body>
<nav><span class="brand">◆ ECONSTELLAR</span><span class="sp"></span>
<a href="../index.html">Portal</a><a href="index.html">Methods</a><a href="../research-engine.html">Workbench</a><a href="../evals.html">Evals</a><a href="../observatory.html">Observatory</a>
<button id="os-kbtn" class="os-kbtn" aria-label="Open command palette (Ctrl+K)">⌘K</button></nav>
<div id="os-strip" role="status" aria-live="polite"></div>
<div class="wrap">${body}
<div class="foot">Generated from <code>GET /api/compute/catalog</code> by <code>scripts/gen-man.mjs</code> —
the catalog is the truth; no hand-written method docs. · <a href="../index.html">Econstellar</a> · SHSSM, IIT Bhubaneswar.</div>
</div>
<script>window.__manbase=1</script>
<script src="../assets/os.js" defer></script>
</body></html>`;

const paperHTML = p => {
  if (!p) return '<span class="none">none — honest: a substrate method; no single companion paper claims it.</span>';
  const m = String(p).match(/(\d{4}\.\d{4,5})/);
  return m ? `<a href="https://arxiv.org/abs/${m[1]}" target="_blank" rel="noopener">${esc(p)}</a>` : esc(p);
};
const exampleParams = (name, ps) => {
  const ex = {};
  for (const [k, v] of Object.entries(ps || {})) {
    if (k === "series" && (v.required || v.n)) {
      const n = Array.isArray(v.n) ? Math.max(2, v.n[0]) : (v.n || 1);
      ex.series = ["India", "USA", "UK", "China", "Brazil", "Japan"].slice(0, Math.min(n, 6));
    }
    if (k === "symbol" && v.required) ex.symbol = "^GSPC";
  }
  if (name === "live_unit_root") { ex.symbol = "^GSPC"; ex.transform = "both"; }
  return ex;
};

const methods = cat.methods || {};
const names = Object.keys(methods);
let made = 0;
for (const name of names) {
  const m = methods[name];
  const ps = m.params || {};
  const paramRows = Object.entries(ps).map(([k, v]) =>
    `<tr><td class="mono">${esc(k)}</td><td class="mono">${esc(v.type)}${v.n ? ` (n=${Array.isArray(v.n) ? v.n.join("–") : v.n})` : ""}</td>` +
    `<td>${v.required ? "<b>required</b>" : "optional"}</td>` +
    `<td class="mono">${v.values ? esc([].concat(v.values).join(" | ")) : ""}${v.min != null || v.max != null ? esc(` [${v.min ?? ""}..${v.max ?? ""}]`) : ""}</td></tr>`).join("");
  const curl = `curl -s -X POST ${ENGINE}/api/compute/run \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({ method: name, params: exampleParams(name, ps) })}'`;
  const body = `
<div class="cat">${esc(m.category || "method")}${m.long_running ? " · async / long-running" : ""}${m.deprecated ? " · DEPRECATED" : ""}</div>
<h1>${esc(name)}</h1>
<div class="desc"><b>${esc(m.label || "")}.</b> ${esc(m.desc || "")}</div>
<h2>Identity</h2>
<div class="kv">version <b>${esc(m.version ?? "—")}</b> · capability <b>${esc(m.capability ?? "—")}</b> · min_obs <b>${esc(m.min_obs ?? "—")}</b> · runner <b>${esc(m.runner)} (${esc(m.script)})</b></div>
<h2>Primitives</h2>
<div class="chips">${(m.primitives && m.primitives.length ? m.primitives : ["—"]).map(p => `<span class="chip">${esc(p)}</span>`).join("")}</div>
<h2>Composes with</h2>
<div class="none">not yet a catalog field — operator-composition metadata lands with Pathway F; nothing is invented here.</div>
<h2>Parameters</h2>
<table><thead><tr><th>name</th><th>type</th><th>req</th><th>values / range</th></tr></thead><tbody>${paramRows || '<tr><td colspan="4">no parameters</td></tr>'}</tbody></table>
<h2>Returns</h2>
<div class="desc">${esc(m.returns || "see the result JSON of a run")}</div>
<h2>Paper</h2>
<div>${paperHTML(m.paper)}</div>
<h2>Changelog</h2>
<div class="kv">${esc(m.changelog || "—")}</div>
<h2>Run it</h2>
<pre>${esc(curl)}</pre>
<div><a href="../research-engine.html#method=${esc(name)}">▶ open in the Workbench with ${esc(name)} preselected</a>${m.long_running ? ' · <span class="none">async: submit via the job manager, not the sync API</span>' : ""}</div>`;
  writeFileSync(join(OUT, `${name}.html`), PAGE(`${name} — ${m.label || ""}`, body));
  made++;
}

/* index: category-grouped listing */
const byCat = {};
names.forEach(n => { const c = methods[n].category || "Other"; (byCat[c] = byCat[c] || []).push(n); });
const idxBody = `
<div class="cat">man pages · generated from the catalog</div>
<h1>Method manual</h1>
<div class="desc">${names.length} operators in the live engine. Every page below is generated from
<code>GET /api/compute/catalog</code> — the registry the engine itself runs from. Where a field is
absent (a paper for a substrate method, composition metadata) the page says so honestly.</div>
${Object.keys(byCat).sort().map(c => `<h2>${esc(c)}</h2><div class="chips">${byCat[c].sort().map(n =>
  `<a class="chip" href="${esc(n)}.html">${esc(n)}${methods[n].long_running ? " ⏳" : ""}</a>`).join("")}</div>`).join("")}
<h2>Cross-references</h2>
<div class="kv"><a href="../evals.html">eval suite</a> — every method graded against its documented verified value ·
<a href="../observatory.html">observatory</a> — the sri_daily series live ·
<a href="../reproduce.html">reproduce</a> — published results regenerated</div>`;
writeFileSync(join(OUT, "index.html"), PAGE("Method manual", idxBody));

console.log(`generated ${made} method pages + index.html → man/ (catalog: ${names.length} methods)`);
