import { pixelpactCase } from "../../lib/pixelpact.js";

const { scenario, render, check, fixture } = pixelpactCase(import.meta.dirname);
const viewport = { width: 800, height: 600 };

// Blink captures a stylesheet as its own MIME part; this is the shape the real client sends.
scenario(
  "checks a document with a CSS sub-resource against its own render",
  async () => {
    const actualHtml = fixture("input.mhtml");

    const reference = await render({ actualHtml, viewport });
    await check({ actualHtml, expected: reference.png, viewport });
  },
);
