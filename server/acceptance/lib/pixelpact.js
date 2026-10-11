import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, inject, it } from "vitest";
import {
  readContainerLogs,
  removeContainer,
  startContainer,
  stopContainer,
} from "./container.js";
import { createRecorder, normalizeLogs, pinGoldens } from "./transcript.js";

/** Everything a case needs. A case says what to do; the goldens say what happened.
 *
 * Each test gets its own container, so the whole log stream belongs to that one
 * test and cases cannot leak state into each other.
 *
 * @param {string} dir the case directory, as `import.meta.dirname`
 * @param {Record<string, string>} env container environment; `LOG_LEVEL=debug`
 *   by default so the goldens capture the full render trace
 */
export function pixelpactCase(dir, env = { LOG_LEVEL: "debug" }) {
  let container;
  let recorder;

  beforeEach(async () => {
    recorder = createRecorder();
    container = await startContainer(inject("image"), env);
  });

  afterEach(async () => {
    if (container) {
      await removeContainer(container);
      container = undefined;
    }
  });

  /** Reads a file next to the case. `"../form/input.mhtml"` works as written. */
  const fixture = (relativePath) =>
    fs.readFileSync(path.resolve(dir, relativePath));

  /** Raw escape hatch. Never throws on a non-2xx - the status is part of the transcript. */
  async function post(route, body) {
    const response = await fetch(`${container.baseUrl}${route}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const raw = await response.text();
    let responseBody;
    try {
      responseBody = JSON.parse(raw);
    } catch {
      // A non-JSON body from a JSON API is itself worth pinning.
      responseBody = { nonJsonBody: raw };
    }
    recorder.record({
      method: "POST",
      route,
      requestBody: body,
      status: response.status,
      responseBody,
    });
    return { status: response.status, body: responseBody };
  }

  async function render({ actualHtml, ...options }) {
    const { status, body } = await post("/render", {
      actualHtml: asText(actualHtml),
      ...options,
    });
    return { status, body, png: asPng(body.actual) };
  }

  async function check({ actualHtml, expected, ...options }) {
    const { status, body } = await post("/check", {
      actualHtml: asText(actualHtml),
      ...(expected === undefined ? {} : { expected: asBase64(expected) }),
      ...options,
    });
    return {
      status,
      body,
      png: asPng(body.actual),
      expected: asPng(body.expected),
      diff: asPng(body.diff),
    };
  }

  /** `it` plus the pinning, so a case body only has to say what to do.
   *
   * The pinning runs inside the test rather than in `afterEach` for two
   * reasons: `toMatchFileSnapshot` needs a test context, and a body that
   * throws should report its own error instead of a pile of golden diffs.
   */
  function scenario(name, body) {
    it(name, async () => {
      await body();
      const exitCode = await stopContainer(container);
      const logs = normalizeLogs(await readContainerLogs(container));
      await pinGoldens({
        dir,
        requests: recorder.requests,
        container: { exitCode },
        logs,
        updateSnapshot: inject("updateSnapshot"),
      });
    });
  }

  return { scenario, render, check, post, fixture };
}

// Buffers in, Buffers out - base64 never appears in a case.
const asText = (value) =>
  Buffer.isBuffer(value) ? value.toString("utf8") : value;
const asBase64 = (value) =>
  Buffer.isBuffer(value) ? value.toString("base64") : value;
const asPng = (value) =>
  typeof value === "string" ? Buffer.from(value, "base64") : undefined;
