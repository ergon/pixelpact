import fs from "fs/promises";
import path from "node:path";
import os from "node:os";
import { chromium } from "playwright";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";

export async function render(actualHtml) {
  const contentServer = new ContentServer();
  const renderer = new BrowserRenderer();
  try {
    await contentServer.start(actualHtml);
    await renderer.start();
    return await renderer.screenshot(contentServer.url);
  } finally {
    await renderer.close();
    await contentServer.close();
  }
}

export class ContentServer {
  async start(actualHtml) {
    await this.setupWorkspace(actualHtml);
    await this.startServer();
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

  async setupWorkspace(actualHtml) {
    this.workingDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "screenshots-")
    );
    await fs.writeFile(
      path.join(this.workingDirectory, "index.html"),
      actualHtml
    );
  }

  async startServer() {
    console.log("Starting rendering server");
    this.server = Fastify();
    this.server.register(fastifyStatic, {
      root: this.workingDirectory,
      prefix: "/",
    });
    await this.server.listen({ port: 0 });
    const address = this.server.addresses().find((e) => e.family === "IPv4");
    this.url = `http://${address["address"]}:${address["port"]}`;
    console.log(`Server ready at ${this.url}`);
  }

  async stopServer() {
    if (this.server) {
      console.log("Stopping rendering server");
      await this.server.close();
    }
  }
}

export class BrowserRenderer {
  async start() {
    this.browser = await chromium.launch();
    console.log("Browser started...");
  }

  async screenshot(url) {
    console.log(`creating screenshot of ${url}`);
    const page = await this.browser.newPage({
      viewport: { width: 1920, height: 1024 },
    });
    console.log(`Go to page`);
    await page.goto(url, { waitUntil: "networkidle" });
    console.log(`shoot and return`);
    return await page.screenshot();
  }

  async close() {
    if (this.browser !== undefined) {
      console.log("Stopping browser");
      await this.browser.close();
      this.browser = undefined;
    }
  }
}
