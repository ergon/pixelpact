import { pixelpactCase } from "../../lib/pixelpact.js";

// Every other case runs at debug. This one runs at the level the image actually
// ships, so the goldens pin what an operator sees in production - and a render
// that starts warning, or stops reporting itself, shows up here.
const { scenario, render, fixture } = pixelpactCase(import.meta.dirname, {
  LOG_LEVEL: "info",
});
const viewport = { width: 800, height: 600 };

scenario("logs a request and its result at the shipped log level", async () => {
  await render({ actualHtml: fixture("../plain/input.mhtml"), viewport });
});
