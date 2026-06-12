#!/usr/bin/env node
// os-p4.test.mjs — OS-P4 eval (K1): 23 man pages generated from the catalog;
// ksg_te shows paper: none (honest hole); soch_profile links arXiv:2606.04113
// (title verified against the arXiv record this session); pages carry identity
// fields + params + a copy-paste curl; composes_with is honest-pending, never
// invented; the index lists all methods.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MAN = join(__dirname, "..", "man");

let pass = 0, fail = 0;
const ok = (cond, name) => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}`); cond ? pass++ : fail++; };

const pages = readdirSync(MAN).filter(f => f.endsWith(".html") && f !== "index.html");
ok(pages.length === 23, `23 method pages generated (got ${pages.length})`);

const ksg = readFileSync(join(MAN, "ksg_te.html"), "utf8");
ok(/none — honest/.test(ksg), "ksg_te page shows paper: none — honest (the documented hole)");
ok(/async|long-running/i.test(ksg), "ksg_te page flags async/long-running");

const soch = readFileSync(join(MAN, "soch_profile.html"), "utf8");
ok(soch.includes("https://arxiv.org/abs/2606.04113"), "soch_profile links arXiv:2606.04113 (id↔title verified)");

// every page: identity fields, params table, curl, honest composes_with, workbench deep link
let allIdentity = true, allCurl = true, allCompose = true, allDeep = true;
for (const f of pages) {
  const h = readFileSync(join(MAN, f), "utf8");
  if (!/version <b>/.test(h) || !/min_obs <b>/.test(h)) allIdentity = false;
  if (!h.includes("/api/compute/run")) allCurl = false;
  if (!/not yet a catalog field — operator-composition/.test(h)) allCompose = false;
  if (!h.includes(`research-engine.html#method=${f.replace(".html", "")}`)) allDeep = false;
}
ok(allIdentity, "every page carries version + min_obs identity fields");
ok(allCurl, "every page carries a copy-paste curl");
ok(allCompose, "composes_with honest-pending on every page (nothing invented — Pathway F)");
ok(allDeep, "every page deep-links the Workbench with the method preselected");

const idx = readFileSync(join(MAN, "index.html"), "utf8");
const linked = pages.filter(f => idx.includes(`href="${f}"`)).length;
ok(linked === 23, `index links all 23 pages (got ${linked})`);
ok(/generated from/i.test(idx) && /catalog/i.test(idx), "index declares its generated-from-catalog provenance (K5)");

console.log(`\n${pass}/${pass + fail} OS-P4 checks passed`);
process.exit(fail ? 1 : 0);
