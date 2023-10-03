import { startApiServer } from "./api";
import { getLocalAddress } from "./helpers.js";
import fs from "fs/promises";

describe("check integration test", () => {
  let instance, baseUrl;

  beforeAll(async () => {
    instance = await startApiServer(0);
    baseUrl = getLocalAddress(instance);
  });

  afterAll(async () => {
    await instance.close();
  });

  it("succeeds when calling check with the reference image generated using render", async (page) => {
    const htmlContent = await mhtmlOf("<h1>Hello World</h1>");
    const reference = await render(htmlContent, page.viewportSize());

    const result = await check(htmlContent, reference, page.viewportSize());

    expect(result.expected).toBe(reference);
    expect(result.actual).toBe(reference);
    expect(result.numDiffPixels).toBe(0);
  });

  it("fails when calling check with a reference obtained from a different HTML content", async (page) => {
    const reference = await render(
      await mhtmlOf("<h1>Hello Jack</h1>"),
      page.viewportSize()
    );
    const result = await check(
      await mhtmlOf("<h1>Hello Jill</h1>"),
      reference,
      page.viewportSize()
    );
    expect(result.expected).toBe(reference);
    expect(result.actual).not.toBe(reference);
    expect(result.numDiffPixels).toBeGreaterThan(0);
  });

  async function render(actualHtml, viewport) {
    const response = await fetch(`${baseUrl}/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actualHtml, viewport }),
    });

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.actual.length).toBeGreaterThan(0);

    return body.actual;
  }

  async function check(actualHtml, expected, viewport) {
    const response = await fetch(`${baseUrl}/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actualHtml, expected, viewport }),
    });

    const body = await response.json();
    expect(body.diff.length).toBeGreaterThan(0);
    expect(body.actual.length).toBeGreaterThan(0);
    expect(body.expected.length).toBeGreaterThan(0);

    return body;
  }
});

async function mhtmlOf(html) {
  const template = (await fs.readFile("testdata/template.mhtml")).toString();
  return template.replace("Hello World", html);
}
