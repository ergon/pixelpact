import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import fs from "fs/promises";
import path from "node:path";
import os from "node:os";
import { chromium } from "playwright";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";

async function snapshot(expected, actualHtml, options) {
  return await withTempFolder(async (workingDirectory) => {
    await fs.writeFile(path.join(workingDirectory, "index.html"), actualHtml);

    return launchServer(workingDirectory, async (url) => {
      console.log(`Site is available at ${url}`);

      return await openPage(
        { viewport: { width: 1920, height: 1024 } },
        async (page) => {
          await page.goto(`${url}`, {
            waitUntil: "networkidle",
          });

          let actual = await page.screenshot();

          return await compare(expected, actual, options);
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

async function compare(expected, actual, options) {
  const expectedPng = PNG.sync.read(expected);
  const actualPng = PNG.sync.read(actual);
  const { width, height } = expectedPng;
  const diff = new PNG({ width, height });
  const numDiffPixels = pixelmatch(
    expectedPng.data,
    actualPng.data,
    diff.data,
    width,
    height,
    options
  );
  return {
    numDiffPixels: numDiffPixels,
    expected: expected,
    actual: actual,
    diff: PNG.sync.write(diff),
  };
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

async function main() {
  const fastify = Fastify({ logger: false });
  fastify.post("/", async (request, reply) => {
    let actualHtml = request.body.actualHtml;
    let expected = Buffer.from(request.body.expected, "base64");
    let result = await snapshot(expected, actualHtml, {
      threshold: 0.01,
    });

    return {
      actual: result.actual.toString("base64"),
      expected: result.expected.toString("base64"),
      diff: result.diff.toString("base64"),
      numDiffPixels: result.numDiffPixels,
    };
  });

  await fastify.listen({ host: "0.0.0.0", port: 8888 });
  console.log("Running!");
}

process.on("SIGINT", function () {
  process.exit();
});

main();
