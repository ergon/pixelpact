import { main } from "./api.js";

process.on("SIGINT", function () {
  process.exit();
});

await main();
