import { startApiServer } from "./api.js";
import { logger } from "./logger.js";

let instance;

async function shutdown(signal) {
  logger.info({ signal }, "Shutting down");
  try {
    if (instance) {
      await instance.close();
    }
  } catch (err) {
    logger.error({ err }, "Failed to shut down cleanly");
    process.exit(1);
  }
  logger.info("Shutdown complete");
  process.exit(0);
}

// React to SIGINT to allow for Crtl+C in local development
process.on("SIGINT", () => shutdown("SIGINT"));

// React to SIGTERM as it is sent by docker stop
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Without these, a crash leaves nothing but an unstructured stack on stderr.
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception");
  process.exit(1);
});
process.on("unhandledRejection", (err) => {
  logger.fatal({ err }, "Unhandled rejection");
  process.exit(1);
});

try {
  instance = await startApiServer();
} catch (err) {
  logger.fatal({ err }, "Failed to start the server");
  process.exit(1);
}
