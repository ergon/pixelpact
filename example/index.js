import fs from "fs/promises";

class PixelpactClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async render(actualHtml) {
    const body = {
      actualHtml,
      viewport: { width: 1920, height: 1024 },
    };

    const response = await fetch(`${this.baseUrl}/render`, {
      method: "post",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });

    const result = await response.json();

    return Buffer.from(result.actual, "base64");
  }

  async checkReferenceImage(actualHtml, referenceImage) {
    const body = {
      actualHtml,
      expected: referenceImage.toString("base64"),
      viewport: { width: 1920, height: 1024 },
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

async function checkReferenceImage(client, actualHtml) {
  const referenceImage = await fs.readFile("screenshots/index-reference.png");

  const result = await client.checkReferenceImage(actualHtml, referenceImage);

  await fs.writeFile("screenshots/index-actual.png", result.actual);
  await fs.writeFile("screenshots/index-diff.png", result.diff);

  console.log(`Pixel difference was: ${result.numDiffPixels}`);
}

async function updateReferenceImage(client, actualHtml) {
  const result = await client.render(actualHtml);
  await fs.writeFile("screenshots/index-reference.png", result);
}

async function main() {
  const args = process.argv.slice(2);
  const client = new PixelpactClient("http://0.0.0.0:8888");

  const actualHtml = (await fs.readFile("index.mhtml")).toString();

  if (args.length > 0 && args[0] === "update") {
    await updateReferenceImage(client, actualHtml);
  } else {
    await checkReferenceImage(client, actualHtml);
  }
}

main();
