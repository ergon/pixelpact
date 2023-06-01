import { startApiServer } from "./api.js";

async function shutdown() {
  if (instance) {
    await instance.close();
  }
  process.exit();
}

// React to SIGINT to allow for Crtl+C in local development
process.on("SIGINT", shutdown);

// React to SIGTERM as it is sent by docker stop
process.on("SIGTERM", shutdown);

const instance = await startApiServer();
