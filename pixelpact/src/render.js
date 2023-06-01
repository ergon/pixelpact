import fs from "fs/promises";
import path from "node:path";
import os from "node:os";
import { chromium } from "playwright";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { getLocalAddress } from "./helpers.js";
import pino from "pino";
import tar from "tar";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
});

export async function render(actualHtml, url, viewport, fullpage, context) {
  const contentServer = new ContentServer();
  const renderer = new BrowserRenderer();
  try {
    await contentServer.start(actualHtml, url, context);
    await renderer.start();
    return await renderer.screenshot(
      `${contentServer.url}${url}`,
      viewport,
      fullpage
    );
  } finally {
    await renderer.close();
    await contentServer.close();
  }
}

export class ContentServer {
  async start(actualHtml, url, context) {
    await this.setupWorkspace(context);
    await this.startServer(actualHtml, url);
  }

  async close() {
    await this.stopServer();
    await this.cleanUpWorkspace();
  }

  async cleanUpWorkspace() {
    if (this.workingDirectory) {
      await fs.rm(this.workingDirectory, { recursive: true, force: true });
      this.workingDirectory = undefined;
    }
  }

  async setupWorkspace(context) {
    this.workingDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "pixelpact-")
    );
    if (context) {
      await this.extractTarGz(context, this.workingDirectory);
    }
  }

  async extractTarGz(context, outputDirectory) {
    await new Promise((resolve, reject) => {
      const writeable = tar.extract({
        gzip: true,
        cwd: outputDirectory,
      });
      writeable.on("end", () => resolve());
      writeable.on("error", (error) => reject(error));
      writeable.write(context);
      writeable.end();
    });
  }

  async startServer(actualHtml, url) {
    logger.debug("Starting rendering server");
    this.server = Fastify();
    this.server.register(fastifyStatic, {
      root: this.workingDirectory,
      prefix: "/",
    });
    this.server.get(url, async (request, reply) => {
      reply.type("text/html").send(actualHtml);
    });
    await this.server.listen({ port: 0 });
    this.url = getLocalAddress(this.server);
    logger.debug(`rendering server ready`, { url: this.url });
  }

  async stopServer() {
    if (this.server) {
      logger.debug("Stopping rendering server");
      await this.server.close();
      logger.debug("Rendering server stopped");
    }
  }
}

export class BrowserRenderer {
  async start() {
    logger.debug("Starting rendering  browser");
    this.browser = await chromium.launch();
    logger.debug("Rendering browser started");
  }

  async screenshot(url, viewport, fullPage) {
    logger.debug("Creating screenshot", { url });
    const page = await this.browser.newPage({ viewport });
    logger.debug("Waiting for page to load", { url });
    await page.goto(url, { waitUntil: "networkidle" });
    logger.debug(`Page loaded`, { url });
    const screenshot = await page.screenshot({ fullPage });
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
