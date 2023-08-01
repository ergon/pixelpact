import { BrowserRenderer } from "./render.js";

describe("BrowserRenderer", () => {
  let renderer = undefined;

  beforeEach(async () => {
    renderer = new BrowserRenderer();
  });

  afterEach(async () => {
    await renderer.close();
  });

  it("start starts a browser", async () => {
    await renderer.start();

    expect(renderer.browser.isConnected()).toBe(true);
  });

  it("screenshot takes a screenshot of the given url", async () => {
    await renderer.start();

    const screenshot = await renderer.screenshot("https://github.com");

    expect(screenshot).toBeInstanceOf(Buffer);
    expect(screenshot.length).toBeGreaterThan(0);
  }, 10000);

  it("close closes the browser", async () => {
    await renderer.start();
    const browser = renderer.browser;

    await renderer.close();

    expect(browser.isConnected()).toBe(false);
    expect(renderer.browser).toBeUndefined();
  });
});
