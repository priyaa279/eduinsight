import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import commandCenter from "../app/data/command-center.generated.json" with { type: "json" };
import askDataset from "../app/data/ask-eduinsight.generated.json" with { type: "json" };
import { withCurrentQualityLifecycle } from "../lib/data-quality/ask-lifecycle-overlay.mjs";
import {
  ensureLifecycleSchema,
  readLifecycleAuditEvents,
  readLifecycleRecords,
  readStoredLifecycles,
  synchronizeLifecycleRecords,
} from "../lib/data-quality/lifecycle-store.mjs";
import {
  isPublicDemoReadOnly,
  normalizedRequestHostname,
} from "../lib/public-demo-mode.mjs";

class NodeD1Statement {
  constructor(statement) {
    this.statement = statement;
    this.parameters = [];
  }
  bind(...parameters) {
    this.parameters = parameters;
    return this;
  }
  async run() { return this.statement.run(...this.parameters); }
  async all() { return { results: this.statement.all(...this.parameters) }; }
  async first() { return this.statement.get(...this.parameters) ?? null; }
}

class NodeD1Database {
  constructor(filePath) { this.database = new DatabaseSync(filePath); }
  prepare(sql) { return new NodeD1Statement(this.database.prepare(sql)); }
  async batch(statements) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
  close() { this.database.close(); }
}

async function fixture({ synchronize = true } = {}) {
  const directory = mkdtempSync(path.join(tmpdir(), "eduinsight-dq-public-read-"));
  const db = new NodeD1Database(path.join(directory, "lifecycle.sqlite"));
  await ensureLifecycleSchema(db);
  if (synchronize) {
    await synchronizeLifecycleRecords(
      db,
      commandCenter.qualityFindings,
      commandCenter.generatedAt,
    );
  }
  return {
    db,
    close() {
      db.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

async function snapshot(db) {
  return {
    lifecycle: await readLifecycleRecords(db),
    audit: await readLifecycleAuditEvents(db),
  };
}

test("public lifecycle reads leave lifecycle and audit database state unchanged", async () => {
  const state = await fixture();
  try {
    const before = await snapshot(state.db);
    const result = await readStoredLifecycles(
      state.db,
      commandCenter.qualityFindings,
      commandCenter.generatedAt,
    );
    const after = await snapshot(state.db);
    assert.equal(result.findings.length, 4);
    assert.deepEqual(after, before);
  } finally {
    state.close();
  }
});

test("public Ask lifecycle overlay is read-only and cannot baseline, reopen, or deactivate", async () => {
  const state = await fixture();
  try {
    const before = await snapshot(state.db);
    const overlaid = await withCurrentQualityLifecycle(askDataset, state.db, {
      allowSynchronization: false,
    });
    const after = await snapshot(state.db);
    assert.equal(overlaid.qualityLifecyclePersistenceAvailable, true);
    assert.deepEqual(after, before);
  } finally {
    state.close();
  }
});

test("trusted local synchronization remains able to create lifecycle state", async () => {
  const state = await fixture({ synchronize: false });
  try {
    assert.equal((await readLifecycleRecords(state.db)).length, 0);
    const overlaid = await withCurrentQualityLifecycle(askDataset, state.db, {
      allowSynchronization: true,
    });
    assert.equal(overlaid.qualityLifecyclePersistenceAvailable, true);
    assert.equal((await readLifecycleRecords(state.db)).length, 4);
  } finally {
    state.close();
  }
});

test("loopback normalization accepts localhost, IPv4, and bracketed IPv6 only", () => {
  for (const url of [
    "http://localhost:3000/api/data-quality/lifecycle",
    "http://127.0.0.1:3000/api/data-quality/lifecycle",
    "http://[::1]:3000/api/data-quality/lifecycle",
  ]) {
    const request = new Request(url);
    assert.equal(isPublicDemoReadOnly(request), false);
  }
  assert.equal(
    normalizedRequestHostname(new Request("http://[::1]:3000/api/test")),
    "::1",
  );
  assert.equal(
    isPublicDemoReadOnly(new Request("https://eduinsight.example/api/test")),
    true,
  );
});

test("route source keeps public GET read-only and public PATCH guarded", () => {
  const route = readFileSync(
    new URL("../app/api/data-quality/lifecycle/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(route, /publicReadOnly\s*\?\s*await readStoredLifecycles/);
  assert.match(route, /export async function PATCH\(request: Request\) \{\s*if \(isPublicDemoReadOnly\(request\)\) return publicDemoReadOnlyResponse\(\);/);
});

test("D1 read failure is returned as unavailable metadata instead of throwing", async () => {
  const failingDb = {
    prepare() {
      throw new Error("D1 unavailable");
    },
  };
  const result = await withCurrentQualityLifecycle(askDataset, failingDb, {
    allowSynchronization: false,
  });
  assert.equal(result.qualityLifecyclePersistenceAvailable, false);
  assert.equal(result.qualityIssues.length, askDataset.qualityIssues.length);
});
