import { startApiServer } from "./api.js";

process.on("SIGINT", function () {
  process.exit();
});

await startApiServer();
