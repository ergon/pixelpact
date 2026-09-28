import { pixelpactCase } from "../../lib/pixelpact.js";

const { scenario, render, check, fixture } = pixelpactCase(import.meta.dirname);
const viewport = { width: 800, height: 600 };

scenario("checks a single-part document against its own render", async () => {
  const actualHtml = fixture("input.mhtml");

  const reference = await render({ actualHtml, viewport });
  await check({ actualHtml, expected: reference.png, viewport });
});
