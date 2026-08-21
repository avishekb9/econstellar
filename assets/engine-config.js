// Single source of truth for the compute-engine base URL.
// The engine is self-hosted (scale-to-zero front door on the research tower);
// the former Cloud Run deployment is retired. To migrate hosts again: edit
// this value, then re-run  node scripts/gen-man.mjs  to regenerate man/*.
window.ECONSTELLAR_ENGINE = "https://sys128-tower-1.tailac24de.ts.net";
