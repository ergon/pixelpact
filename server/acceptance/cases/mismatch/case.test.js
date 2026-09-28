import { pixelpactCase } from "../../lib/pixelpact.js";

const { scenario, render, check, fixture } = pixelpactCase(import.meta.dirname);
const viewport = { width: 800, height: 600 };

// Same document as ../form, one heading changed. The reference is rendered here
// rather than read from form/golden, so no golden is ever an input to a case.
scenario(
  "reports a diff when the reference came from different HTML",
  async () => {
    const reference = await render({
      actualHtml: fixture("../form/input.mhtml"),
      viewport,
    });

    await check({
      actualHtml: fixture("input.mhtml"),
      expected: reference.png,
      viewport,
    });
  },
);
