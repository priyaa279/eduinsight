import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

const EXPECTED = Object.freeze({
  workerName: "eduinsight-ai",
  compatibilityFlag: "nodejs_compat",
  d1Binding: "DB",
  d1Name: "eduinsight-demo-db",
  migrationsDirectory: "drizzle",
  r2Binding: "ARTIFACTS",
  r2Name: "eduinsight-demo-artifacts",
});

const PLACEHOLDER_PATTERN = /(?:<?to_be_created>?|placeholder|site-creator-(?:d1|r2)|00000000-0000-4000-8000-000000000000)/i;
const D1_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function findBinding(bindings, binding) {
  return Array.isArray(bindings)
    ? bindings.find((candidate) => candidate?.binding === binding)
    : undefined;
}

function hasPlaceholder(value) {
  return typeof value !== "string" || value.length === 0 || PLACEHOLDER_PATTERN.test(value);
}

export function validateCloudflareDeployment(sourceConfig, generatedConfig) {
  const issues = [];
  const placeholderIssues = [];

  if (sourceConfig?.name !== EXPECTED.workerName) {
    issues.push(`Source Worker name must be ${EXPECTED.workerName}.`);
  }
  if (!sourceConfig?.compatibility_flags?.includes(EXPECTED.compatibilityFlag)) {
    issues.push(`Source config must enable ${EXPECTED.compatibilityFlag}.`);
  }

  const sourceD1 = findBinding(sourceConfig?.d1_databases, EXPECTED.d1Binding);
  const sourceR2 = findBinding(sourceConfig?.r2_buckets, EXPECTED.r2Binding);
  if (!sourceD1) issues.push(`Source config is missing D1 binding ${EXPECTED.d1Binding}.`);
  if (!sourceR2) issues.push(`Source config is missing R2 binding ${EXPECTED.r2Binding}.`);

  if (sourceD1) {
    if (sourceD1.database_name !== EXPECTED.d1Name) {
      issues.push(`D1 database_name must be ${EXPECTED.d1Name}.`);
    }
    if (sourceD1.migrations_dir !== EXPECTED.migrationsDirectory) {
      issues.push(`D1 migrations_dir must be ${EXPECTED.migrationsDirectory}.`);
    }
    if (hasPlaceholder(sourceD1.database_id)) {
      placeholderIssues.push("D1 database_id still requires a real Cloudflare resource ID.");
    } else if (!D1_ID_PATTERN.test(sourceD1.database_id)) {
      issues.push("D1 database_id must be a valid Cloudflare UUID.");
    }
  }

  if (sourceR2) {
    if (hasPlaceholder(sourceR2.bucket_name)) {
      placeholderIssues.push("R2 bucket_name still requires the provisioned public-demo bucket name.");
    } else if (sourceR2.bucket_name !== EXPECTED.r2Name) {
      issues.push(`R2 bucket_name must be ${EXPECTED.r2Name}.`);
    }
  }

  if (!generatedConfig) {
    issues.push("Generated dist/server/wrangler.json is missing; run npm run build.");
  } else {
    if (generatedConfig.name !== sourceConfig?.name) {
      issues.push("Generated Worker name does not match the source config.");
    }
    if (!generatedConfig.compatibility_flags?.includes(EXPECTED.compatibilityFlag)) {
      issues.push(`Generated config must enable ${EXPECTED.compatibilityFlag}.`);
    }

    const generatedD1 = findBinding(generatedConfig.d1_databases, EXPECTED.d1Binding);
    const generatedR2 = findBinding(generatedConfig.r2_buckets, EXPECTED.r2Binding);
    if (!generatedD1) issues.push(`Generated config is missing D1 binding ${EXPECTED.d1Binding}.`);
    if (!generatedR2) issues.push(`Generated config is missing R2 binding ${EXPECTED.r2Binding}.`);
    if (generatedD1?.migrations_dir !== EXPECTED.migrationsDirectory) {
      issues.push(`Generated D1 migrations_dir must be ${EXPECTED.migrationsDirectory}.`);
    }
    if (generatedD1 && hasPlaceholder(generatedD1.database_id)) {
      placeholderIssues.push("Generated D1 database_id still contains a placeholder.");
    }
    if (generatedR2 && hasPlaceholder(generatedR2.bucket_name)) {
      placeholderIssues.push("Generated R2 bucket_name still contains a placeholder.");
    }
  }

  return {
    ready: issues.length === 0 && placeholderIssues.length === 0,
    issues,
    placeholderIssues,
  };
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function validateFiles(rootDirectory = process.cwd()) {
  const sourcePath = path.join(rootDirectory, "wrangler.jsonc");
  const generatedPath = path.join(rootDirectory, "dist", "server", "wrangler.json");
  const sourceConfig = readJson(sourcePath);
  const generatedConfig = existsSync(generatedPath) ? readJson(generatedPath) : undefined;
  return validateCloudflareDeployment(sourceConfig, generatedConfig);
}

function run() {
  let result;
  try {
    result = validateFiles();
  } catch (error) {
    console.error("DEPLOYMENT CONFIGURATION INVALID");
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  if (result.ready) {
    console.log("DEPLOYMENT CONFIGURATION VERIFIED");
    return;
  }

  if (result.placeholderIssues.length > 0) {
    console.error("NOT READY TO DEPLOY — REAL CLOUDFLARE RESOURCE IDS REQUIRED");
  } else {
    console.error("DEPLOYMENT CONFIGURATION INVALID");
  }
  for (const issue of [...result.placeholderIssues, ...result.issues]) {
    console.error(`- ${issue}`);
  }
  process.exitCode = 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (invokedPath === import.meta.url) run();
