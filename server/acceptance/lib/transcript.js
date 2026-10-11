import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { expect } from "vitest";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

/** Strings at least this long are payloads, not values worth reading inline. */
const BLOB_MIN_LENGTH = 256;
const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const TRANSCRIPT = "transcript.json";
const LOGS = "logs.jsonl";

/** Collects every request a case makes so the whole exchange can be pinned at once.
 * Cases assert nothing themselves; this is what makes that possible. */
export function createRecorder() {
  const requests = [];
  return {
    record(exchange) {
      // The number only ever surfaces in the payload filenames; the transcript
      // gets its order from the array.
      requests.push({ number: requests.length + 1, ...exchange });
    },
    requests,
  };
}

/** Pins the recorded exchange, the response payloads and the log stream
 * against `<case>/golden/`.
 *
 * Text goldens go through vitest's own `toMatchFileSnapshot`, so `-u` handling
 * is public API. Buffers are compared byte-exact and follow the same
 * `updateSnapshot` semantics by hand: "all" rewrites, "new" fills in what is
 * missing, "none" (CI) treats a missing golden as a failure.
 */
export async function pinGoldens({
  dir,
  requests,
  container,
  logs,
  updateSnapshot,
}) {
  const goldenDirectory = path.join(dir, "golden");
  const transcript = { requests: [], container };
  const payloads = new Map();

  for (const {
    number,
    method,
    route,
    requestBody,
    status,
    responseBody,
  } of requests) {
    const operation = route.replace(/^\//, "");
    transcript.requests.push({
      method,
      path: route,
      // No `payloads`, so a request payload gets a descriptor but no file of its
      // own: it is either a repository fixture or an earlier response, and the
      // sha is what shows that linkage.
      body: elide(requestBody, {}),
      response: {
        status,
        body: elide(responseBody, { number, operation, payloads }),
      },
    });
  }

  if (updateSnapshot === "all") {
    await fs.rm(goldenDirectory, { recursive: true, force: true });
  }
  await fs.mkdir(goldenDirectory, { recursive: true });

  for (const [name, bytes] of payloads) {
    await pinBuffer({ dir, goldenDirectory, name, bytes, updateSnapshot });
  }

  await expect(`${JSON.stringify(transcript, null, 2)}\n`).toMatchFileSnapshot(
    path.join(goldenDirectory, TRANSCRIPT),
  );
  await expect(
    logs.map((entry) => `${JSON.stringify(entry)}\n`).join(""),
  ).toMatchFileSnapshot(path.join(goldenDirectory, LOGS));

  await assertNothingObsolete(goldenDirectory, [
    ...payloads.keys(),
    TRANSCRIPT,
    LOGS,
  ]);
}

/** Replaces payload strings with a descriptor, and records the bytes to pin
 * when {@link payloads} is supplied. */
function elide(body, { number, operation, payloads }) {
  const elided = {};
  for (const [key, value] of Object.entries(body ?? {})) {
    if (typeof value !== "string" || value.length < BLOB_MIN_LENGTH) {
      elided[key] = value;
      continue;
    }
    const { kind, bytes, extension } = classify(value);
    let name;
    if (payloads) {
      name = `${String(number).padStart(2, "0")}-${operation}.${key}.${extension}`;
      payloads.set(name, bytes);
    }
    const digest = crypto
      .createHash("sha256")
      .update(bytes)
      .digest("hex")
      .slice(0, 12);
    elided[key] =
      `<${kind} ${bytes.length} bytes sha256:${digest}${name ? ` -> ${name}` : ""}>`;
  }
  return elided;
}

function classify(value) {
  const decoded = decodeBase64(value);
  if (decoded?.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    return { kind: "png", bytes: decoded, extension: "png" };
  }
  const bytes = Buffer.from(value, "utf8");
  const isMhtml = /^(From: |MIME-Version:)/m.test(value);
  return {
    kind: isMhtml ? "mhtml" : "text",
    bytes,
    extension: isMhtml ? "mhtml" : "txt",
  };
}

function decodeBase64(value) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    return undefined;
  }
  const decoded = Buffer.from(value, "base64");
  return decoded.length > 0 ? decoded : undefined;
}

async function pinBuffer({
  dir,
  goldenDirectory,
  name,
  bytes,
  updateSnapshot,
}) {
  const file = path.join(goldenDirectory, name);
  const golden = await fs.readFile(file).catch(() => undefined);

  if (updateSnapshot === "all" || (updateSnapshot === "new" && !golden)) {
    await fs.writeFile(file, bytes);
    return;
  }
  if (!golden) {
    throw new Error(
      `Golden golden/${name} is missing. Regenerate with \`npm run test:acceptance -- -u\`.`,
    );
  }
  if (Buffer.compare(golden, bytes) !== 0) {
    const out = await dumpFailure({ dir, name, actual: bytes, golden });
    throw new Error(
      `Golden golden/${name} differs (${golden.length} -> ${bytes.length} bytes). ` +
        `Wrote both sides to ${out}.`,
    );
  }
}

/** A case that stops making a request must not leave its golden behind. */
async function assertNothingObsolete(goldenDirectory, accounted) {
  const present = await fs.readdir(goldenDirectory);
  const obsolete = present.filter((name) => !accounted.includes(name));
  if (obsolete.length > 0) {
    throw new Error(
      `Obsolete goldens no longer produced by this case: ${obsolete.join(", ")}. ` +
        `Remove them, or regenerate with \`npm run test:acceptance -- -u\`.`,
    );
  }
}

async function dumpFailure({ dir, name, actual, golden }) {
  const out = path.join(dir, "..", "..", "out", path.basename(dir));
  await fs.mkdir(out, { recursive: true });
  await fs.writeFile(path.join(out, `actual-${name}`), actual);
  await fs.writeFile(path.join(out, `golden-${name}`), golden);
  if (name.endsWith(".png")) {
    await writePixelDiff(path.join(out, `pixeldiff-${name}`), actual, golden);
  }
  return path.relative(path.join(dir, "..", ".."), out);
}

/** A human-readable diff for the failure artifacts only - never an assertion. */
async function writePixelDiff(file, actual, golden) {
  try {
    const actualPng = PNG.sync.read(actual);
    const goldenPng = PNG.sync.read(golden);
    if (
      actualPng.width !== goldenPng.width ||
      actualPng.height !== goldenPng.height
    ) {
      return;
    }
    const diff = new PNG({ width: actualPng.width, height: actualPng.height });
    pixelmatch(
      goldenPng.data,
      actualPng.data,
      diff.data,
      actualPng.width,
      actualPng.height,
      { threshold: 0 },
    );
    await fs.writeFile(file, PNG.sync.write(diff));
  } catch {
    // Debugging aid; never the reason a test fails.
  }
}

/** Turns the container's output into stable, comparable entries.
 *
 * Unparseable stdout is kept as `raw` rather than dropped - a stray
 * `console.log` or a half-formatted stack is broken logging and should fail.
 * Anything on stderr is a crash, not logging, so it is marked as such.
 */
export function normalizeLogs({ stdout, stderr }) {
  return [
    ...lines(stdout).map(normalizeLine),
    ...lines(stderr).map((line) => ({ stream: "stderr", raw: scrub(line) })),
  ];
}

function lines(output) {
  return output.split("\n").filter((line) => line.trim().length > 0);
}

function normalizeLine(line) {
  try {
    // Wall clock, pid and hostname differ on every run and say nothing.
    const { time, pid, hostname, ...rest } = JSON.parse(line);
    return scrubDeep(rest);
  } catch {
    return { raw: scrub(line) };
  }
}

/** Fields whose value is different on every run. The placeholder keeps the
 * field itself pinned, so one appearing or disappearing is still a failure -
 * only its unstable value is dropped. Timings, durations and byte counts that
 * *are* stable (actualBytes, numDiffPixels, browserVersion) stay verbatim:
 * browserVersion in particular is how a playwright bump announces itself. */
const VOLATILE = {
  responseTime: "<ms>",
  host: "<host>",
  remoteAddress: "<address>",
  remotePort: "<port>",
};

const isDuration = (key) => /^(duration|.*Duration)Ms$/.test(key);

function scrub(value) {
  return (
    value
      // A fresh mkdtemp per request.
      .replace(/\/tmp\/pixelpact-[A-Za-z0-9]+/g, "<workspace>")
      // The container's bridge IP and the published ephemeral port.
      .replace(/http:\/\/\d+\.\d+\.\d+\.\d+:\d+/g, "<address>")
  );
}

function scrubDeep(value) {
  if (typeof value === "string") {
    return scrub(value);
  }
  if (Array.isArray(value)) {
    return value.map(scrubDeep);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => {
        if (isDuration(key)) {
          return [key, "<ms>"];
        }
        return [key, key in VOLATILE ? VOLATILE[key] : scrubDeep(nested)];
      }),
    );
  }
  return value;
}
