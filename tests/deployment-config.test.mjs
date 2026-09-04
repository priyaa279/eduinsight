import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { isPublicDemoReadOnly } from "../lib/public-demo-mode.mjs";
import { validateCloudflareDeployment } from "../scripts/validate-cloudflare-deployment.mjs";

const root = process.cwd();
const source = JSON.parse(readFileSync(path.join(root, "wrangler.jsonc"), "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));

function validPair() {
  const validSource = clone(source);
  validSource.d1_databases[0].database_id = "12345678-1234-4234-8234-1234567890ab";
  validSource.r2_buckets[0].bucket_name = "eduinsight-demo-artifacts";
  const generated = {
    ...clone(validSource),
    main: "index.js",
    assets: { directory: "../client" },
  };
  return { validSource, generated };
}

test("source Wrangler config declares the reviewed Worker and required bindings", () => {
  assert.equal(source.name, "eduinsight-ai");
  assert.equal(source.compatibility_date, "2026-05-15");
  assert.ok(source.compatibility_flags.includes("nodejs_compat"));
  assert.deepEqual(source.d1_databases.map(({ binding }) => binding), ["DB"]);
  assert.equal(source.d1_databases[0].database_name, "eduinsight-demo-db");
  assert.equal(source.d1_databases[0].migrations_dir, "drizzle");
  assert.deepEqual(source.r2_buckets.map(({ binding }) => binding), ["ARTIFACTS"]);
});

test("placeholder resource identifiers fail closed", () => {
  const placeholderSource = clone(source);
  placeholderSource.d1_databases[0].database_id = "TO_BE_CREATED";
  placeholderSource.r2_buckets[0].bucket_name = "placeholder-eduinsight-demo-artifacts";
  const result = validateCloudflareDeployment(placeholderSource, clone(placeholderSource));
  assert.equal(result.ready, false);
  assert.ok(result.placeholderIssues.some((issue) => issue.includes("D1")));
  assert.ok(result.placeholderIssues.some((issue) => issue.includes("R2")));
});

test("a structurally valid source and generated config pass validation", () => {
  const { validSource, generated } = validPair();
  assert.deepEqual(validateCloudflareDeployment(validSource, generated), {
    ready: true,
    issues: [],
    placeholderIssues: [],
  });
});

test("workers.dev hosts remain public-demo read-only while local hosts remain writable", () => {
  const requestFor = (host) => new Request(`https://${host}/api/data-quality/lifecycle`);
  assert.equal(isPublicDemoReadOnly(requestFor("eduinsight-ai.example.workers.dev")), true);
  assert.equal(isPublicDemoReadOnly(requestFor("localhost")), false);
  assert.equal(isPublicDemoReadOnly(requestFor("127.0.0.1")), false);
  assert.equal(isPublicDemoReadOnly(requestFor("[::1]")), false);
});

test("local Cloudflare credentials and state are ignored without ignoring deployment source", () => {
  const gitignore = readFileSync(path.join(root, ".gitignore"), "utf8");
  assert.match(gitignore, /^\.dev\.vars$/m);
  assert.match(gitignore, /^\.dev\.vars\.\*$/m);
  assert.match(gitignore, /^\/\.wrangler\/$/m);
  assert.doesNotMatch(gitignore, /wrangler\.jsonc/);
  assert.doesNotMatch(gitignore, /^\/drizzle\/$/m);
});

test("required current IPEDS deployment-source files are present", () => {
  for (const relativePath of [
    "lib/ipeds-validation-presentation.mjs",
    "tests/ipeds-completions-action-flow.test.mjs",
    "tests/ipeds-validation-workflow-state.test.mjs",
  ]) {
    assert.equal(existsSync(path.join(root, relativePath)), true, `${relativePath} must exist`);
  }
});

test("preview and deploy scripts validate before using the generated Worker snapshot", () => {
  const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  assert.match(packageJson.scripts["preview:worker"], /^npm run check:deployment-config && /);
  assert.match(packageJson.scripts["deploy:worker"], /^npm run check:deployment-config && /);
  assert.match(packageJson.scripts["deploy:worker"], /--config dist\/server\/wrangler\.json/);
});
