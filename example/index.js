import fs from "fs/promises";

class PixelpactClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async render(actualHtml) {
    const body = {
      actualHtml,
    };

    const response = await fetch(`${this.baseUrl}/render`, {
      method: "post",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });

    const result = await response.json();

    return Buffer.from(result.actual, "base64");
  }

  async check(actualHtml, referenceImage) {
    const body = {
      actualHtml,
      expected: referenceImage.toString("base64"),
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

async function check(client, actualHtml) {
  const referenceImage = await fs.readFile("screenshots/index-reference.png");

  const result = await client.check(actualHtml, referenceImage);

  await fs.writeFile("screenshots/index-actual.png", result.actual);
  await fs.writeFile("screenshots/index-diff.png", result.diff);

  console.log(`Pixel difference was: ${result.numDiffPixels}`);
}

async function update(client, actualHtml) {
  const result = await client.render(actualHtml);
  await fs.writeFile("screenshots/index-reference.png", result);
}

async function main() {
  const args = process.argv.slice(2);
  const client = new PixelpactClient("http://0.0.0.0:8888");

  const actualHtml = (await fs.readFile("index.html")).toString();

  if (args.length > 0 && args[0] === "update") {
    await update(client, actualHtml);
  } else {
    await check(client, actualHtml);
  }
}

main();
