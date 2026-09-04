import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import {
  isPublicDemoReadOnly,
  publicDemoReadOnlyResponse,
} from "../lib/public-demo-mode.mjs";

test("local development hosts remain writable", () => {
  assert.equal(isPublicDemoReadOnly(new Request("http://localhost:3000/api/test")), false);
  assert.equal(isPublicDemoReadOnly(new Request("http://127.0.0.1:3000/api/test")), false);
  assert.equal(isPublicDemoReadOnly(new Request("http://[::1]:3000/api/test")), false);
});

test("public portfolio hosts are read-only", () => {
  assert.equal(
    isPublicDemoReadOnly(new Request("https://eduinsight.example/api/test")),
    true,
  );
});

test("public mutation attempts fail safely", async () => {
  const response = publicDemoReadOnlyResponse();
  assert.equal(response.status, 403);
  const body = await response.json();
  assert.equal(body.mode, "public-demo-read-only");
  assert.match(body.error, /read-only/i);
});

test("both shared-state mutation routes enforce the public guard first", async () => {
  const [lifecycleRoute, approvalRoute] = await Promise.all([
    fs.readFile(
      new URL("../app/api/data-quality/lifecycle/route.ts", import.meta.url),
      "utf8",
    ),
    fs.readFile(
      new URL("../app/api/ipeds/approvals/route.ts", import.meta.url),
      "utf8",
    ),
  ]);
  assert.match(
    lifecycleRoute,
    /export async function PATCH\(request: Request\) \{\s*if \(isPublicDemoReadOnly\(request\)\) return publicDemoReadOnlyResponse\(\);/,
  );
  assert.match(
    approvalRoute,
    /export async function POST\(request: Request\) \{\s*if \(isPublicDemoReadOnly\(request\)\) return publicDemoReadOnlyResponse\(\);/,
  );
});
