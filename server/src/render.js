import fs from "fs/promises";
import path from "node:path";
import os from "node:os";
import { chromium } from "playwright";
import { convert } from "mhtml-to-html";
import { logger } from "./logger.js";

export async function render(
  actualMhtml,
  viewport,
  fullpage,
  style,
  usehMhtmlConverter,
) {
  const renderer = new BrowserRenderer();
  const workspaceDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "pixelpact-"),
  );
  let indexFile;
  if (usehMhtmlConverter) {
    indexFile = `${workspaceDirectory}/index.html`;
    const { data: actualHtml } = await convert(actualMhtml);
    await fs.writeFile(indexFile, actualHtml);
  } else {
    indexFile = `${workspaceDirectory}/index.mhtml`;
    await fs.writeFile(indexFile, actualMhtml);
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
  async start() {
    this.browser = await chromium.launch();
    logger.debug("Browser launched");
  }

  async screenshot(url, viewport, fullPage, style) {
    logger.debug({ url }, "Loading page");
    const page = await this.browser.newPage({ viewport });
    await page.goto(url);
    const screenshot = await page.screenshot({ fullPage, style });
    logger.debug({ url }, "Screenshot taken");
    return screenshot;
  }

  async close() {
    if (this.browser !== undefined) {
      await this.browser.close();
      this.browser = undefined;
      logger.debug("Browser closed");
    }
  }
}
