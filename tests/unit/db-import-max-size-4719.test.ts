// #4719 — DB backup import failed for databases larger than the hard-coded 100 MB cap.
// Real databases bloat (a 156 MB file VACUUMs down to 5 MB) but still couldn't be
// re-imported. The cap is now operator-tunable via OMNIROUTE_DB_IMPORT_MAX_MB, with the
// new default of 1000 MB (1 GB) and a 1000 MB ceiling.
import test from "node:test";
import assert from "node:assert/strict";

const { resolveMaxUploadSizeBytes } = await import(
  "../../src/app/api/db-backups/import/route.ts"
);

const MB = 1024 * 1024;

test("defaults to 1000 MB when env is unset (#4719)", () => {
  assert.equal(resolveMaxUploadSizeBytes({}), 1000 * MB);
});

test("honors OMNIROUTE_DB_IMPORT_MAX_MB (#4719)", () => {
  assert.equal(resolveMaxUploadSizeBytes({ OMNIROUTE_DB_IMPORT_MAX_MB: "256" }), 256 * MB);
});

test("clamps values above 1000 MB to the 1000 MB ceiling (#4719)", () => {
  assert.equal(resolveMaxUploadSizeBytes({ OMNIROUTE_DB_IMPORT_MAX_MB: "999999" }), 1000 * MB);
  assert.equal(resolveMaxUploadSizeBytes({ OMNIROUTE_DB_IMPORT_MAX_MB: "2000" }), 1000 * MB);
  assert.equal(resolveMaxUploadSizeBytes({ OMNIROUTE_DB_IMPORT_MAX_MB: "1500" }), 1000 * MB);
});

test("falls back to 1000 MB default for invalid / out-of-range values (#4719)", () => {
  assert.equal(resolveMaxUploadSizeBytes({ OMNIROUTE_DB_IMPORT_MAX_MB: "abc" }), 1000 * MB);
  assert.equal(resolveMaxUploadSizeBytes({ OMNIROUTE_DB_IMPORT_MAX_MB: "0" }), 1000 * MB);
  assert.equal(resolveMaxUploadSizeBytes({ OMNIROUTE_DB_IMPORT_MAX_MB: "-5" }), 1000 * MB);
});

test("floors fractional MB values (#4719)", () => {
  assert.equal(resolveMaxUploadSizeBytes({ OMNIROUTE_DB_IMPORT_MAX_MB: "150.9" }), 150 * MB);
});
