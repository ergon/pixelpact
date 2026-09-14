import { spawn } from "node:child_process";

const READY_DEADLINE_MS = 60_000;
const READY_POLL_MS = 250;
/** What `index.js` logs once fastify is bound. */
const LISTENING_MESSAGE = "Server listening at";

/** Runs `docker` with {@link args}.
 * @param {string[]} args
 * @param {{stream?: boolean}} options `stream` inherits stdio instead of capturing it,
 *   so a cold `docker build` reports progress as it happens.
 * @returns {Promise<{stdout: string, stderr: string, code: number}>}
 */
export function docker(args, { stream = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", args, {
      stdio: stream
        ? ["ignore", "inherit", "inherit"]
        : ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => (stdout += chunk));
    child.stderr?.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        reject(
          new Error(
            `docker ${args.join(" ")} exited with ${code}${stderr ? `\n${stderr}` : ""}`,
          ),
        );
      }
    });
  });
}

/** Starts a container of {@link image} and waits until it is listening.
 *
 * The image hardcodes port 8888 with no PORT override, so the host side is
 * published as an ephemeral port to keep concurrent runs from colliding.
 *
 * @param {string} image
 * @param {Record<string, string>} env passed through as `-e KEY=VALUE`
 * @returns {Promise<{id: string, baseUrl: string}>}
 */
export async function startContainer(image, env) {
  const environment = Object.entries(env).flatMap(([key, value]) => [
    "-e",
    `${key}=${value}`,
  ]);
  const { stdout } = await docker([
    "run",
    "--detach",
    "--publish",
    "127.0.0.1:0:8888",
    ...environment,
    image,
  ]);
  const id = stdout.trim();

  try {
    const container = { id, baseUrl: await resolveBaseUrl(id) };
    await waitUntilReady(container);
    return container;
  } catch (error) {
    // Never leak a container just because it failed to come up.
    await removeContainer({ id }).catch(() => {});
    throw error;
  }
}

async function resolveBaseUrl(id) {
  const { stdout } = await docker(["port", id, "8888/tcp"]);
  const port = stdout.trim().split("\n")[0]?.split(":").pop();
  if (!port) {
    throw new Error(`Failed to resolve the published port of container ${id}`);
  }
  return `http://127.0.0.1:${port}`;
}

/** Waits for the server to say it is listening.
 *
 * Readiness is read from the log rather than probed over HTTP on purpose: a
 * probe request would land in the log golden of every single case and shift
 * every reqId. It also needs no route, which the server is short of - there is
 * no GET endpoint and no healthcheck.
 *
 * This means a case must run at a level where `info` is emitted. Every case
 * does; a quieter one would need a different signal.
 */
async function waitUntilReady(container) {
  const deadline = Date.now() + READY_DEADLINE_MS;
  while (Date.now() < deadline) {
    const { stdout, stderr } = await readContainerLogs(container);
    if (stdout.includes(LISTENING_MESSAGE)) {
      return;
    }
    if (!(await isRunning(container))) {
      throw new Error(
        `Container ${container.id} exited before it started listening.` +
          logTail({ stdout, stderr }),
      );
    }
    await new Promise((resolve) => setTimeout(resolve, READY_POLL_MS));
  }
  throw new Error(
    `Container ${container.id} did not log "${LISTENING_MESSAGE}" within ` +
      `${READY_DEADLINE_MS}ms.` +
      logTail(await readContainerLogs(container).catch(() => ({}))),
  );
}

async function isRunning(container) {
  const { stdout } = await docker([
    "inspect",
    "--format",
    "{{.State.Running}}",
    container.id,
  ]);
  return stdout.trim() === "true";
}

function logTail({ stdout = "", stderr = "" }) {
  return `\n--- container logs ---\n${stdout}${stderr}`;
}

/** Stops the container so the log stream covers the whole lifecycle,
 * including whatever the SIGTERM handler does.
 * @returns {Promise<number>} the container's exit code
 */
export async function stopContainer(container) {
  await docker(["stop", "--timeout", "5", container.id]);
  const { stdout } = await docker([
    "inspect",
    "--format",
    "{{.State.ExitCode}}",
    container.id,
  ]);
  return Number(stdout.trim());
}

/** Reads everything the container wrote. stdout and stderr are captured
 * separately because docker demultiplexes them; stderr is appended last and
 * marked by {@link normalizeLogs}, since anything there is a crash, not logging. */
export async function readContainerLogs(container) {
  const { stdout, stderr } = await docker(["logs", container.id]);
  return { stdout, stderr };
}

export async function removeContainer(container) {
  await docker(["rm", "--force", container.id]);
}
