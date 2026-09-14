import fs from "fs/promises";
import path from "node:path";
import os from "node:os";
import { chromium } from "playwright";
import { convert } from "mhtml-to-html";
import { logger, measure } from "./logger.js";

export async function render(
  actualMhtml,
  viewport,
  fullpage,
  style,
  usehMhtmlConverter,
  log = logger,
) {
  const renderer = new BrowserRenderer(log);
  const workspaceDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "pixelpact-"),
  );
  log.debug(
    { mhtmlBytes: actualMhtml.length, workspaceDirectory },
    "Rendering page source",
  );

  let indexFile;
  if (usehMhtmlConverter) {
    indexFile = `${workspaceDirectory}/index.html`;
    const { data: actualHtml } = await convert(actualMhtml);
    await fs.writeFile(indexFile, actualHtml);
    log.debug(
      { indexFile, htmlBytes: actualHtml.length },
      "Converted MHTML to HTML",
    );
  } else {
    indexFile = `${workspaceDirectory}/index.mhtml`;
    await fs.writeFile(indexFile, actualMhtml);
    log.debug({ indexFile }, "Wrote MHTML as is");
  }
  try {
    await renderer.start();
    return await renderer.screenshot(
      `file://${indexFile}`,
      viewport,
      fullpage,
      style,
    );
  } finally {
    await fs.rm(indexFile);
    await fs.rmdir(workspaceDirectory);
    await renderer.close();
  }
}

export class BrowserRenderer {
  constructor(log = logger) {
    this.log = log;
  }

  async start() {
    const [browser, durationMs] = await measure(() => chromium.launch());
    this.browser = browser;
    this.log.debug(
      { browserVersion: browser.version(), durationMs },
      "Browser launched",
    );
  }

  async screenshot(url, viewport, fullPage, style) {
    this.log.debug({ url }, "Loading page");
    const [page, loadDurationMs] = await measure(async () => {
      const page = await this.browser.newPage({ viewport });
      await page.goto(url);
      return page;
    });

    const [screenshot, screenshotDurationMs] = await measure(() =>
      page.screenshot({ fullPage, style }),
    );
    this.log.debug(
      { url, loadDurationMs, screenshotDurationMs, bytes: screenshot.length },
      "Screenshot taken",
    );
    return screenshot;
  }

  async close() {
    if (this.browser !== undefined) {
      await this.browser.close();
      this.browser = undefined;
      this.log.debug("Browser closed");
    }
  }
}
