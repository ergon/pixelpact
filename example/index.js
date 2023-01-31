import fetch from "node-fetch";
import fs from "fs/promises";

class PixelpactClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async check(actualHtml, referenceImage) {
    const body = {
      actualHtml,
      expected: referenceImage.toString("base64"),
    };

    const response = await fetch(this.baseUrl, {
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

async function main() {
  const client = new PixelpactClient("http://0.0.0.0:8888/");

  const actualHtml = (await fs.readFile("index.html")).toString();
  const referenceImage = await fs.readFile("screenshots/index-reference.png");

  const result = await client.check(actualHtml, referenceImage);

  await fs.writeFile("screenshots/index-actual.png", result.actual);
  await fs.writeFile("screenshots/index-diff.png", result.diff);

  console.log(`Pixel difference was: ${result.numDiffPixels}`);
}

main();
