import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("Completions presents generation, validation, and downloads in workflow order", () => {
  const actionStart = page.indexOf('<div className="ipeds-actions">');
  const actionEnd = page.indexOf("</div>", actionStart);
  const actions = page.slice(actionStart, actionEnd);

  const generate = actions.indexOf("Generate review file");
  const validate = actions.indexOf("Run validation");
  const draft = actions.indexOf("Download review draft");
  const csv = actions.indexOf("Download review CSV");

  assert.ok(generate >= 0);
  assert.ok(validate > generate);
  assert.ok(draft > validate);
  assert.ok(csv > draft);
});

test("Completions generation wording follows the real generated state", () => {
  assert.match(
    page,
    /isCompletions && generated\s*\? "Regenerate review file"\s*:\s*"Generate review file"/,
  );
  assert.match(page, /setGenerated\(true\)/);
  assert.match(page, /setGenerated\(false\)/);
});

test("Completions downloads are disabled until the session artifact exists", () => {
  const actionStart = page.indexOf('<div className="ipeds-actions">');
  const actionEnd = page.indexOf("</div>", actionStart);
  const actions = page.slice(actionStart, actionEnd);

  assert.equal((actions.match(/disabled=\{!generated\}/g) ?? []).length, 2);
  assert.match(actions, /packageData\.uploadText/);
  assert.match(actions, /packageData\.reviewCsv/);
});

test("Completions does not duplicate its download buttons below validation", () => {
  const lowerDownloadStart = page.indexOf('{generated ? (\n                <div className="download-row">');
  const lowerDownloadEnd = page.indexOf('<p className="filename-caption">', lowerDownloadStart);
  const lowerDownloadControls = page.slice(lowerDownloadStart, lowerDownloadEnd);

  assert.match(lowerDownloadControls, /\{!isCompletions \? \(\s*<>\s*<button/s);
});

test("action controls wrap accessibly without changing button hierarchy", () => {
  assert.match(css, /\.ipeds-actions\s*\{[^}]*max-width:\s*100%/s);
  assert.match(
    css,
    /@media \(max-width: 768px\)[\s\S]*?\.ipeds-actions \.button\s*\{[^}]*min-height:\s*44px/s,
  );
  assert.match(
    css,
    /@media \(max-width: 640px\)[\s\S]*?\.ipeds-actions \.button\s*\{[^}]*flex:\s*1 1 100%/s,
  );
  assert.match(page, /className="button button-primary"[\s\S]*?Generate review file/);
  assert.ok((page.match(/className="button button-secondary"/g) ?? []).length >= 3);
});
