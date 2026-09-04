import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import {
  approvalMatchesCurrentArtifact,
  CURRENT_IPEDS_REVIEW_STATUS,
  readIpedsApprovalRows,
} from "../lib/ipeds-approval-store.mjs";
import { isPublicDemoReadOnly } from "../lib/public-demo-mode.mjs";

function fakeDb() {
  const state = { prepares: 0, reads: 0 };
  return {
    state,
    prepare(sql) {
      state.prepares += 1;
      assert.match(sql, /^\s*SELECT/i);
      return {
        async all() {
          state.reads += 1;
          return { results: [] };
        },
      };
    },
  };
}

test("public approval read performs no schema or persistent write", async () => {
  const db = fakeDb();
  let schemaCalls = 0;
  await readIpedsApprovalRows({ db, initializeSchema: false, ensureSchema: async () => { schemaCalls += 1; } });
  assert.equal(schemaCalls, 0);
  assert.deepEqual(db.state, { prepares: 1, reads: 1 });
});

test("local approval read may initialize its schema and remains functional", async () => {
  const db = fakeDb();
  let schemaCalls = 0;
  await readIpedsApprovalRows({ db, initializeSchema: true, ensureSchema: async () => { schemaCalls += 1; } });
  assert.equal(schemaCalls, 1);
  assert.equal(db.state.reads, 1);
});

test("public approval mutation host is blocked while localhost remains trusted", () => {
  assert.equal(isPublicDemoReadOnly(new Request("https://portfolio.example/api/ipeds/approvals")), true);
  assert.equal(isPublicDemoReadOnly(new Request("http://localhost:3000/api/ipeds/approvals")), false);
});

test("current approval wording is institutional review rather than NCES upload", () => {
  assert.equal(CURRENT_IPEDS_REVIEW_STATUS, "Ready for IPEDS keyholder review");
  assert.doesNotMatch(CURRENT_IPEDS_REVIEW_STATUS, /upload|submit|DCS/i);
});

test("complete source-backed exact artifact is eligible under the binding helper", () => {
  const pkg = { specId: "s", collectionYear: "2025-26", uploadText: "artifact", sourceReadiness: "source_backed", completeSurveyPackage: true, structuralFailureCount: 0, reconciliationFailureCount: 0, completenessFailureCount: 0 };
  assert.equal(approvalMatchesCurrentArtifact({ specId: "s", collectionYear: "2025-26", uploadText: "artifact" }, pkg), true);
});

test("changed artifact and incomplete package cannot inherit approval", () => {
  const pkg = { specId: "s", collectionYear: "2025-26", uploadText: "artifact", sourceReadiness: "source_backed", completeSurveyPackage: true, structuralFailureCount: 0, reconciliationFailureCount: 0, completenessFailureCount: 0 };
  assert.equal(approvalMatchesCurrentArtifact({ specId: "s", collectionYear: "2025-26", uploadText: "changed" }, pkg), false);
  assert.equal(approvalMatchesCurrentArtifact({ specId: "s", collectionYear: "2025-26", uploadText: "artifact" }, { ...pkg, completeSurveyPackage: false, completenessFailureCount: 1 }), false);
});

test("approval route guards writes before storage and uses current wording", async () => {
  const route = await fs.readFile(new URL("../app/api/ipeds/approvals/route.ts", import.meta.url), "utf8");
  assert.match(route, /POST\(request: Request\)[\s\S]*?isPublicDemoReadOnly\(request\)/);
  assert.match(route, /CURRENT_IPEDS_REVIEW_STATUS/);
  assert.match(route, /approvalMatchesCurrentArtifact/);
  assert.match(route, /EduInsight does not submit data to NCES|marked ready for IPEDS keyholder review|official import-layout package/);
});

test("historical approval wording is preserved and only display-mapped", async () => {
  const page = await fs.readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /status === "Ready for keyholder upload to NCES DCS"/);
  assert.match(page, /\? "Ready for IPEDS keyholder review"/);
  assert.match(page, /Historical event wording is retained in the immutable record/);
});
