import fs from "fs/promises";
import path from "node:path";
import os from "node:os";
import { chromium } from "playwright";
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
});

export async function render(actualHtml, viewport, fullpage) {
  const renderer = new BrowserRenderer();
  const workspaceDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "pixelpact-"),
  );
  const indexFile = `${workspaceDirectory}/index.mhtml`;
  await fs.writeFile(indexFile, actualHtml);
  try {
    await renderer.start();
    return await renderer.screenshot(`file://${indexFile}`, viewport, fullpage);
  } finally {
    await fs.rm(indexFile);
    await fs.rmdir(workspaceDirectory);
    await renderer.close();
  }
}

export class BrowserRenderer {
  async start() {
    logger.debug("Starting rendering  browser");
    this.browser = await chromium.launch();
    logger.debug("Rendering browser started");
  }

  async screenshot(url, viewport, fullPage, style) {
    logger.debug("Creating screenshot", { url });
    const page = await this.browser.newPage({ viewport });
    logger.debug("Waiting for page to load", { url });
    await page.goto(url);
    logger.debug(`Page loaded`, { url });
    const screenshot = await page.screenshot({ fullPage, style });
    logger.debug(`Screenshot taken`);
    return screenshot;
  }

  async close() {
    if (this.browser !== undefined) {
      logger.debug("Stopping rendering browser");
      await this.browser.close();
      this.browser = undefined;
      logger.debug("rendering browser stopped");
    }
  }
}
