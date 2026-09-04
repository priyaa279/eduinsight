import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const cliPath = fileURLToPath(
  new URL("../node_modules/vinext/dist/cli.js", import.meta.url),
);

async function waitForServer(url, process, output) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (process.exitCode !== null) {
      throw new Error(`Built server exited before rendering:\n${output.join("")}`);
    }
    try {
      const response = await fetch(url, {
        headers: { accept: "text/html" },
      });
      if (response.ok) return response;
    } catch {
      // The supported production runtime is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out waiting for the built server:\n${output.join("")}`);
}

test("server-renders the EduInsight workspace in the supported local Worker runtime", async (t) => {
  const port = 4300 + (process.pid % 500);
  const output = [];
  const server = spawn(
    process.execPath,
    [cliPath, "dev", "--host", "127.0.0.1", "--port", String(port)],
    {
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      env: { ...process.env, NODE_ENV: "development" },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  server.stdout.on("data", (chunk) => output.push(String(chunk)));
  server.stderr.on("data", (chunk) => output.push(String(chunk)));
  t.after(() => server.kill("SIGTERM"));

  const response = await waitForServer(`http://localhost:${port}/`, server, output);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>EduInsight AI — Institutional Intelligence<\/title>/i);
  assert.match(html, /Institutional command center/);
  assert.doesNotMatch(html, /Demo environment · Synthetic higher-education data/);
  assert.match(
    html,
    /Data: Synthetic institutional dataset created for demonstration and testing\./,
  );
  assert.match(html, /Ask your institution/);
  assert.match(html, /Data quality/);
  assert.match(html, /IPEDS center/);
  assert.doesNotMatch(html, /Agents online|agents active|codex-preview|react-loading-skeleton/i);
});
