#!/usr/bin/env node
/* probe-failures.mjs — OS-P5 dual-space hardening probe (K1 eval for the audit).
   Every public functional, hit in FAILURE MODE. The dual-space mandate: every
   error is structured JSON with an honest reason — no stack traces, no HTML
   error pages, no bare text. Run: node evals/probe-failures.mjs
   Exit non-zero if any functional violates the mandate. */
const ENGINE = process.env.ENGINE_URL || "https://shssm-compute-b7ui3oxaqq-el.a.run.app";

let pass = 0, fail = 0;
const ok = (cond, name, detail) => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : "  ⟵ " + detail}`); cond ? pass++ : fail++; };

const isCleanJSON = (text) => { try { JSON.parse(text); } catch { return false; } return true; };
const noStack = (text) => !/\bat\s+\S+\s+\(|node:internal|Traceback|<html|<!DOCTYPE/i.test(text);

async function probe(name, path, { method = "GET", body, headers, expectStatus } = {}) {
  try {
    const r = await fetch(ENGINE + path, { method, body, headers, signal: AbortSignal.timeout(45000) });
    const text = await r.text();
    const okJSON = isCleanJSON(text), okStack = noStack(text);
    const okStatus = expectStatus ? expectStatus.includes(r.status) : true;
    ok(okJSON && okStack && okStatus, name,
      `HTTP ${r.status}${okJSON ? "" : " NON-JSON"}${okStack ? "" : " STACK/HTML"} body: ${text.slice(0, 110).replace(/\n/g, "\\n")}`);
    return { status: r.status, text };
  } catch (e) { ok(false, name, `request error: ${e.message}`); return { status: 0, text: "" }; }
}

console.log("── normal paths (sanity: structured 200s) ──");
await probe("GET /health", "/health", { expectStatus: [200] });
await probe("GET /metrics", "/metrics", { expectStatus: [200] });
await probe("GET /api/compute/catalog", "/api/compute/catalog", { expectStatus: [200] });
await probe("GET /api/sri/current", "/api/sri/current", { expectStatus: [200] });
await probe("GET /api/sri/history", "/api/sri/history", { expectStatus: [200] });
await probe("GET /api/sri/network", "/api/sri/network", { expectStatus: [200] });

console.log("── compute/run failure modes ──");
await probe("unknown method", "/api/compute/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ method: "nonexistent_method", params: {} }), expectStatus: [400, 404, 422] });
await probe("unknown series", "/api/compute/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ method: "unit_root", params: { series: ["Atlantis"] } }), expectStatus: [200, 400, 422] });
await probe("malformed JSON body", "/api/compute/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{not json", expectStatus: [400] });
await probe("missing body", "/api/compute/run", { method: "POST", headers: { "Content-Type": "application/json" }, expectStatus: [400] });
await probe("oversized body (70KB)", "/api/compute/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ method: "unit_root", params: { junk: "x".repeat(70 * 1024) } }), expectStatus: [413] });
await probe("wrong content-type", "/api/compute/run", { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ method: "unit_root", params: { series: ["India"] } }), expectStatus: [200, 400, 415] });

console.log("── sri failure modes ──");
await probe("sri/network garbage date", "/api/sri/network?date=not-a-date", { expectStatus: [200] });
await probe("sri/network 1900 date", "/api/sri/network?date=1900-01-01", { expectStatus: [200] });
await probe("sri/history garbage range", "/api/sri/history?start=zzz&end=000", { expectStatus: [200] });

console.log("── situate failure modes ──");
await probe("situate malformed JSON", "/api/situate", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{nope", expectStatus: [400] });
await probe("situate empty body", "/api/situate", { method: "POST", headers: { "Content-Type": "application/json" }, body: "", expectStatus: [200, 400] });
await probe("situate via GET (route is POST-only)", "/api/situate", { expectStatus: [404, 405] });

console.log("── LLM endpoints, malformed only (no spend) ──");
await probe("chat malformed", "/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{nope", expectStatus: [400] });
/* empty chat message: the engine deliberately answers 200 with a canned usage
   hint (zero LLM spend, "ran": null) — clean JSON, honest, no cost. Documented
   behaviour, not a wart; 400 would also satisfy the mandate. */
await probe("chat empty message", "/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}), expectStatus: [200, 400] });
await probe("research malformed", "/api/research", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{nope", expectStatus: [400] });

console.log("── unknown routes (the fallthrough) ──");
await probe("GET /api/nonexistent", "/api/nonexistent", { expectStatus: [404] });
await probe("GET /totally/bogus", "/totally/bogus", { expectStatus: [404] });
await probe("POST /api/compute/run via PUT", "/api/compute/run", { method: "PUT", expectStatus: [404, 405] });

console.log(`\n${pass}/${pass + fail} hardening probes passed`);
process.exit(fail ? 1 : 0);
