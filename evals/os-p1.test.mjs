#!/usr/bin/env node
// os-p1.test.mjs — OS-P1 eval (K1): the command palette opens on Ctrl/Cmd+K,
// fuzzy-matches "granger", and Enter lands on the Workbench with granger
// preselected (research-engine.html#method=granger — the workbench's real
// hash route). Keyboard-only path throughout. Drives the shipped assets/os.js
// in node:vm with a DOM stub.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeEnv, jsonResponse } from "./_dom-stub.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(__dirname, "..", "assets", "os.js"), "utf8");

const CATALOG = { methods: { granger: { label: "Granger Causality Network" }, garch: { label: "GARCH(1,1)" } } };

const { env, hrefSink } = makeEnv({
  fetchImpl: url => String(url).includes("/api/compute/catalog") ? jsonResponse(CATALOG)
    : Promise.reject(new Error("not stubbed")),
});
const ctx = vm.createContext(env);
vm.runInContext(SRC, ctx, { filename: "os.js" });
const os = env.window.__os;

let pass = 0, fail = 0;
const ok = (cond, name) => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}`); cond ? pass++ : fail++; };

// ── fuzzy matcher sanity ──
ok(os.fuzzy("granger", "granger Granger Causality Network") >= 0, "fuzzy: exact substring matches");
ok(os.fuzzy("grg", "granger") >= 0, "fuzzy: subsequence matches");
ok(os.fuzzy("zzz", "granger") < 0, "fuzzy: non-match rejected");
ok(os.fuzzy("granger", "granger method") > os.fuzzy("ger", "granger method"), "fuzzy: fuller match scores higher");

// ── Ctrl+K opens, Esc closes (global keyboard path) ──
env.document.dispatch("keydown", { ctrlKey: true, key: "k", preventDefault() { } });
ok(os.pal.open === true, "Ctrl+K opens the palette");
const wrapper = env.document.getElementById("os-palette");
ok(!!wrapper, "palette dialog mounted in DOM");
ok((wrapper.innerHTML || wrapper._html || "").includes('role="dialog"'), "dialog role present (a11y)");
env.document.dispatch("keydown", { key: "Escape" });
ok(os.pal.open === false, "Esc closes the palette");

// ── fuzzy-match "granger" → top results contain the method, Enter navigates ──
os.openPalette();
await new Promise(r => setTimeout(r, 10));           // let the catalog fetch resolve
os.pal.q = "granger"; os.pal.sel = 0;
const results = os.filterItems("granger");
ok(results.length > 0, 'filter("granger") returns results');
ok(results[0].kind === "method" && results[0].label === "granger", 'top result is the granger method');
os.activate(results[0]);
ok(hrefSink.href === "research-engine.html#method=granger",
  `Enter lands on workbench with granger preselected (got: ${hrefSink.href})`);

// ── pages + actions are reachable through the same palette ──
const pageHit = os.filterItems("observatory");
ok(pageHit.some(r => r.href === "observatory.html"), "pages findable (observatory)");
const actHit = os.filterItems("copy engine");
ok(actHit.some(r => r.kind === "action"), "actions findable (copy engine URL)");
actHit.filter(r => r.kind === "action")[0].run();
ok(hrefSink.copied && hrefSink.copied.startsWith("https://shssm-compute"), "copy action writes the engine URL");

console.log(`\n${pass}/${pass + fail} OS-P1 checks passed`);
process.exit(fail ? 1 : 0);
