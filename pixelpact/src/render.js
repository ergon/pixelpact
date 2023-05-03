import fs from "fs/promises";
import path from "node:path";
import os from "node:os";
import { chromium } from "playwright";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";

export async function render(actualHtml) {
  return await withTempFolder(async (workingDirectory) => {
    await fs.writeFile(path.join(workingDirectory, "index.html"), actualHtml);
    return await launchServer(workingDirectory, async (url) => {
      console.log(`Site is available at ${url}`);
      return await openPage(
        { viewport: { width: 1920, height: 1024 } },
        async (page) => {
          await page.goto(`${url}`, {
            waitUntil: "networkidle",
          });

          return await page.screenshot();
        }
      );
    });
  });
}

async function withTempFolder(block) {
  let workingDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "screenshots-")
  );
  try {
    return await block(workingDirectory);
  } finally {
    await fs.rm(workingDirectory, { recursive: true, force: true });
  }
}

async function openPage(options, block) {
  console.log("Starting browser");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage(options);

    return await block(page);
  } finally {
    console.log("Stopping browser");
    browser.close();
  }
}

async function launchServer(directory, block) {
  console.log("Starting server");
  const fastify = Fastify({ logger: false });
  fastify.register(fastifyStatic, {
    root: directory,
    prefix: "/",
  });
  try {
    await fastify.listen({ port: 0 });
    let address = fastify.addresses().find((e) => e.family === "IPv4");
    let url = `http://${address["address"]}:${address["port"]}`;
    return await block(url);
  } finally {
    console.log("Stopping server");
    fastify.close();
  }
}
