#!/usr/bin/env node
// reproduce-page.test.mjs — M1 Step 5 eval (K1): the NAMH machine-exact badge and
// the amber state of reproduce.html. The badge builder namhBadgeHTML is PURE
// (result → HTML string, window.__repro hook), so the green, red and amber render
// paths are driven directly with fixtures — the amber path is exercised, not
// assumed. Static checks assert the D1 honesty wording every reader sees.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML = readFileSync(join(__dirname, "..", "reproduce.html"), "utf8");
const TEXT = HTML.replace(/<[^>]+>/g, "");

let pass = 0, fail = 0;
const ok = (cond, name) => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}`); cond ? pass++ : fail++; };

// ── static DOM honesty checks (D1 bar, visible without JS) ──
ok(/amber: empty under the paper's own gate — pending/i.test(TEXT), "amber statusbar carries the D1 phrase verbatim");
ok(/never green, never magnitude-dressed/i.test(TEXT), "amber statusbar: never green, never magnitude-dressed");
ok(/0 of 552 possible edges in every one of the 20 windows/i.test(TEXT), "amber statusbar: 0/552 × 20 windows stated");
ok(/namh_pipeline/.test(HTML), "amber statusbar points to the seeded async namh_pipeline");
ok(/method:"namh_reproduce"/.test(HTML), "page calls the live namh_reproduce Δ-verifier");
ok(/01_hurst_panel\.csv/.test(HTML), "badge names its cached reference (01_hurst_panel.csv)");

// ── M2 FORMAL element (Phase 33): honest sorry-count, never overclaimed ──
ok(/id="sochformal"/.test(HTML), "FORMAL element present in the SOCH card");
ok(/11 of 12 declarations Lean-accepted/.test(TEXT), "FORMAL: proved declaration count stated");
ok(/prop:spectrum is formally closed/.test(TEXT), "FORMAL: prop:spectrum closure stated (it IS a Lean theorem)");
ok(/exactly one.{0,40}positive frequency/i.test(TEXT), "FORMAL: FOC existence+uniqueness stated as proved");
ok(/sorry-count 1 of 12/.test(TEXT), "FORMAL: honest sorry-count stated (0 = formally closed)");
ok(/stated, not proved/i.test(TEXT), "FORMAL: lem:peak analytic remainder marked stated-not-proved");
// lockstep check: the page's claimed count must equal the Lean source's actual
// sorry count (block comments stripped). Skips when the Lean tree is absent.
const LEAN = "/home/ecolex/versiondevs/ivy-fineco/papers/SOCH/lean4/sochlean/Sochlean/Spectrum.lean";
try {
  const src = readFileSync(LEAN, "utf8").replace(/\/-[\s\S]*?-\//g, "");
  const sorries = (src.match(/\bsorry\b/g) || []).length;
  const m = TEXT.match(/sorry-count\s*(\d+) of (\d+)/);
  ok(!!m && Number(m[1]) === sorries, `page sorry-count (${m && m[1]}) matches Lean source (${sorries})`);
} catch { console.log("SKIP  Lean tree absent on this machine — page claim checked statically only"); }

// ── drive the pure badge builder: green, red, amber, and missing paths ──
const fnMatch = HTML.match(/function namhBadgeHTML[\s\S]*?\n}/);
ok(!!fnMatch, "pure namhBadgeHTML builder found in inline script");
const sandbox = { Number, String, JSON };
vm.createContext(sandbox);
vm.runInContext(fnMatch[0] + "; this.__fn = namhBadgeHTML;", sandbox, { filename: "namhBadgeHTML.js" });
const badge = sandbox.__fn;

const FDR = { quantity: "fdr_network", edges_retained_total: 0, n_possible: 552, n_windows: 20, status: "amber" };
const GREEN = { quantities: [{ quantity: "hurst_panel", status: "green", max_abs_delta: 4.9e-9, n_compared: 440 }, FDR] };
const RED = { quantities: [{ quantity: "hurst_panel", status: "red", max_abs_delta: 1.3e-2, n_compared: 440 }, FDR] };

const g = badge(GREEN);
ok(/machine-exact/.test(g), "green path renders the machine-exact badge");
ok(/4\.9e-9/.test(g), "green path shows the MEASURED max|Δ| (never an assumed zero)");
ok(/440 finite H cells/.test(g), "green path names the comparison size");
ok(/amber/.test(g) && /empty under the paper.s own gate/.test(g) && /pending/.test(g), "amber network state renders inside the badge");
ok(/0 of 552/.test(g), "amber decomposition (0 of 552) renders");

const r = badge(RED);
ok(/differs/.test(r) && /a red is information/.test(r), "red path renders honestly (a red is information)");
ok(!/machine-exact/.test(r), "red path never claims machine-exact");

ok(badge({ quantities: [FDR] }) === null, "missing hurst quantity → no badge fabricated (null)");

console.log(`\n${pass}/${pass + fail} reproduce-page checks passed`);
process.exit(fail ? 1 : 0);
