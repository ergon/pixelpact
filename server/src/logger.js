import pino from "pino";

export const logger = pino({
  name: "pixelpact",
  level: resolveLevel(),
  // Log "info" instead of 30 - raw `docker logs` output stays readable.
  formatters: { level: (label) => ({ level: label }) },
  timestamp: pino.stdTimeFunctions.isoTime,
});

function resolveLevel() {
  if (process.env.LOG_LEVEL) {
    return process.env.LOG_LEVEL;
  }
  return process.env.NODE_ENV === "test" ? "silent" : "info";
}
