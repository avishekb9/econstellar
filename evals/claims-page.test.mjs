#!/usr/bin/env node
// claims-page.test.mjs — Phase 34 (V4 M3) eval (K1): the "What we know" panel.
// The renderers are PURE (claim → HTML string, window.__claims hook), so the
// established / contested / superseded / hole / degrade paths are all DRIVEN
// with fixtures — never assumed. Static checks assert the honesty wording:
// verified-ground-truth seeding, visible contested/superseded states, and a
// degrade path that fabricates nothing.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML = readFileSync(join(__dirname, "..", "claims.html"), "utf8");
const TEXT = HTML.replace(/<[^>]+>/g, "");

let pass = 0, fail = 0;
const ok = (cond, name) => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}`); cond ? pass++ : fail++; };

// ── static honesty checks ──
ok(/verified ground truth only/i.test(TEXT), "lede: seeded from verified ground truth only");
ok(/Contested.*superseded.*visible states|contested.*and.*superseded.*are visible/is.test(TEXT), "contested/superseded named as visible states");
ok(/history of revision is part of the knowledge/i.test(TEXT), "revision-history honesty phrase present");
ok(/never assigned by hand/i.test(TEXT), "confidence = measured pass-rates, never assigned by hand");
ok(/GET \/api\/claims/.test(TEXT), "footer names the read endpoint");
ok(/\/api\/claims/.test(HTML) && /shssm-compute/.test(HTML), "page fetches the live engine /api/claims");
ok(/--oi-blue:#0072B2/.test(HTML), "Okabe-Ito palette declared (data marks)");
ok(/claims-seed\.mjs/.test(TEXT), "degrade text points at the provisioning script");

// ── extract the inline script and drive the pure renderers ──
const script = (HTML.match(/<script>([\s\S]*?)<\/script>/g) || []).map(s => s.replace(/<\/?script>/g, "")).join("\n");
const el = () => ({ innerHTML: "" });
const sandbox = {
  window: {}, document: { getElementById: el },
  fetch: () => Promise.reject(new Error("stub: no network in eval")),
  AbortSignal: { timeout: () => null },
  console, String, Number, Array, Math, JSON, isNaN,
};
vm.createContext(sandbox);
vm.runInContext(script, sandbox, { filename: "claims-inline.js" });
const C = sandbox.window.__claims;
ok(!!C && typeof C.claimCardHTML === "function", "pure renderers exposed on window.__claims");

const EST = {
  claim_id: "soch_b_shape_symmetry", type: "empirical", status: "established",
  statement: "SOCH-B shape symmetry holds 28/28 at baseline.", confidence: 0.991,
  conditions: ["grid: tau x J, 112 tests"], counter_conditions: [],
  provenance_ids: ["badge:robustness.badges/soch_b", "job:job_20260608_8c295764", "eval:evals.json/soch_profile", "method:soch_profile", "chronology:#39"],
  paper_refs: ["arXiv:2606.04113"],
  established_at: "2026-06-03T00:00:00Z", last_verified: "2026-06-11T00:00:00Z",
};
const CONT = {
  claim_id: "waveqte_gfc_channel_split", type: "empirical", status: "contested",
  statement: "Manuscript 50.0% Financial vs engine 27.9% Trade.", confidence: null,
  conditions: ["engine side: Table-5-exact"], counter_conditions: ["manuscript side: Financial-GFC 50.0%"],
  provenance_ids: ["file:papers/waveqte/contagion_manuscript.pdf"], paper_refs: [],
  established_at: "2026-06-09T00:00:00Z", last_verified: "2026-06-12T00:00:00Z",
};
const SUP = { ...EST, claim_id: "old_claim", status: "superseded", confidence: null };
const HOLE = { ...CONT, claim_id: "mcpfm_sri_pending", type: "hole", status: "established", counter_conditions: [] };

const e = C.claimCardHTML(EST);
ok(/st-established/.test(e) && /class="claim established"/.test(e), "established path renders with its chip");
ok(/0\.991/.test(e) && /pass-rate/.test(e), "confidence bar shows the MEASURED pass-rate");
ok(/fragile aggregate &ne; refutation|read with its decomposition/.test(e), "badge read-with-decomposition caveat in the card");
ok(/href="research-engine\.html#job=job_20260608_8c295764"/.test(e), "job provenance click-through to the public permalink");
ok(/href="https:\/\/arxiv\.org\/abs\/2606\.04113"/.test(e), "paper ref links to arXiv");
ok(/href="man\/soch_profile\.html"/.test(e), "method provenance links to its man page");
ok(/>chronology:#39</.test(e) && !/href="[^"]*#39/.test(e), "repo-internal provenance stays a plain chip (no dead link)");

const c = C.claimCardHTML(CONT);
ok(/st-contested/.test(c) && /under investigation/.test(c), "contested path renders visibly, marked under investigation");
ok(/the other side/.test(c) && /Financial-GFC 50\.0%/.test(c), "contested card carries BOTH sides");
ok(!/conffill/.test(c), "null confidence → no bar fabricated");

ok(/class="claim superseded"/.test(C.claimCardHTML(SUP)), "superseded path renders (dimmed, still visible)");
ok(/>hole</.test(C.claimCardHTML(HOLE)), "hole-type claims render as claims about gaps");
ok(C.claimCardHTML(null) === null && C.claimCardHTML({}) === null, "no claim → no card fabricated (null)");

const s = C.summaryHTML([EST, CONT, SUP, HOLE]);
ok(/>4<\/b> claims/.test(s) && />2<\/b> established/.test(s) && />1<\/b> contested/.test(s) && />1<\/b> superseded/.test(s), "summary counts every status");
ok(/2026-06-12/.test(s), "summary shows the latest verification date");

const d = C.degradeHTML("bigquery 404: dataset epistemic not found");
ok(/Honest pending/.test(d) && /dataset epistemic not found/.test(d), "degrade path shows the honest reason verbatim");
ok(/no fabricated/i.test(d), "degrade path promises (and renders) no fabricated claims");

console.log(`\n${pass}/${pass + fail} claims-page checks passed`);
process.exit(fail ? 1 : 0);
