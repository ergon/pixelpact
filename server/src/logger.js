import { AsyncLocalStorage } from "node:async_hooks";
import pino from "pino";

const context = new AsyncLocalStorage();

export const logger = pino({
  name: "pixelpact",
  level: resolveLevel(),
  // Log "info" instead of 30 - raw `docker logs` output stays readable.
  formatters: { level: (label) => ({ level: label }) },
  timestamp: pino.stdTimeFunctions.isoTime,
  mixin: (fields, level, instance) =>
    instance === logger ? { ...context.getStore() } : {},
});

export function withLogContext(fields, fn) {
  return context.run(fields, fn);
}

export async function measure(fn) {
  const startedAt = performance.now();
  return [await fn(), Math.round(performance.now() - startedAt)];
}

function resolveLevel() {
  if (process.env.LOG_LEVEL) {
    return process.env.LOG_LEVEL;
  }
  return process.env.NODE_ENV === "test" ? "silent" : "info";
}
