import fs from "fs/promises";
import tar from "tar";

class PixelpactClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async render(actualHtml, context) {
    const body = {
      actualHtml,
      viewport: { width: 1920, height: 1024 },
      context: context.toString("base64"),
    };

    const response = await fetch(`${this.baseUrl}/render`, {
      method: "post",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });

    const result = await response.json();

    return Buffer.from(result.actual, "base64");
  }

  async check(actualHtml, referenceImage, context) {
    const body = {
      actualHtml,
      expected: referenceImage.toString("base64"),
      viewport: { width: 1920, height: 1024 },
      context: context.toString("base64"),
    };

    const response = await fetch(`${this.baseUrl}/check`, {
      method: "post",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });

    const result = await response.json();

    return {
      actual: Buffer.from(result.actual, "base64"),
      expected: Buffer.from(result.expected, "base64"),
      diff: Buffer.from(result.diff, "base64"),
      numDiffPixels: result.numDiffPixels,
    };
  }
}

async function check(client, actualHtml, context) {
  const referenceImage = await fs.readFile("screenshots/index-reference.png");

  const result = await client.check(actualHtml, referenceImage, context);

  await fs.writeFile("screenshots/index-actual.png", result.actual);
  await fs.writeFile("screenshots/index-diff.png", result.diff);

  console.log(`Pixel difference was: ${result.numDiffPixels}`);
}

async function update(client, actualHtml, context) {
  const result = await client.render(actualHtml, context);
  await fs.writeFile("screenshots/index-reference.png", result);
}

async function prepareContext() {
  return await new Promise((resolve, reject) => {
    const readable = tar.create(
      {
        gzip: true,
      },
      ["example.css"]
    );
    const parts = [];
    readable.on("data", (data) => parts.push(data));
    readable.on("error", (error) => reject(error));
    readable.on("end", () => {
      resolve(Buffer.concat(parts));
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const client = new PixelpactClient("http://0.0.0.0:8888");

  const actualHtml = (await fs.readFile("index.html")).toString();
  const context = await prepareContext();

  if (args.length > 0 && args[0] === "update") {
    await update(client, actualHtml, context);
  } else {
    await check(client, actualHtml, context);
  }
}

main();
