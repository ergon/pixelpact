import { pixelpactCase } from "../../lib/pixelpact.js";

const { scenario, render, fixture } = pixelpactCase(import.meta.dirname);
const viewport = { width: 800, height: 600 };

// Both renders are pinned, so the goldens show the flag actually reaching playwright.
scenario("captures the whole page only when fullpage is set", async () => {
  const actualHtml = fixture("input.mhtml");

  await render({ actualHtml, viewport });
  await render({ actualHtml, viewport, fullpage: true });
});
