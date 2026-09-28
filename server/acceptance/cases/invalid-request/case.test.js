import { pixelpactCase } from "../../lib/pixelpact.js";

const { scenario, check, fixture } = pixelpactCase(import.meta.dirname);

// The 400, the error envelope and the logged error all land in the goldens
// without this case naming any of them.
scenario("rejects a check without a viewport", async () => {
  await check({ actualHtml: fixture("../plain/input.mhtml") });
});
