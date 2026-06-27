const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const rootDir = path.resolve(__dirname, "..");

test("worker serves registry content from R2 without Docker Hub upstream", () => {
  const workerSource = fs.readFileSync(
    path.join(rootDir, "src", "index.js"),
    "utf8"
  );
  const wranglerConfig = fs.readFileSync(
    path.join(rootDir, "wrangler.toml"),
    "utf8"
  );

  assert.doesNotMatch(workerSource, /registry-1\.docker\.io/);
  assert.doesNotMatch(workerSource, /dockerHub/);
  assert.doesNotMatch(workerSource, /\/v2\/auth/);
  assert.doesNotMatch(workerSource, /WWW-Authenticate/);
  assert.doesNotMatch(workerSource, /resp\.status == 307/);
  assert.match(workerSource, /REGISTRY_BUCKET\.get/);
  assert.match(workerSource, /crypto\.subtle\.digest/);
  assert.match(wranglerConfig, /binding\s*=\s*"REGISTRY_BUCKET"/);
  assert.match(wranglerConfig, /bucket_name\s*=\s*"myt"/);
});