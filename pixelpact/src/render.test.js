import { ContentServer } from "./render.js";
import fs from "fs";

describe("ContentServer", () => {
  const anHtmlString = "<h1>Hello World</h1>";
  let contentServer = undefined;

  beforeEach(async () => {
    contentServer = new ContentServer();
  });

  afterEach(async () => {
    contentServer.close();
  });

  it("start prepares a temporary directory with an index.html", async () => {
    await contentServer.start(anHtmlString);

    expect(contentServer.workingDirectory).toExist();
    expect(`${contentServer.workingDirectory}/index.html`).toHaveContent(
      anHtmlString
    );
  });

  it("serves the the given html string over HTTP after calling start", async () => {
    await contentServer.start(anHtmlString);

    const response = await fetch(contentServer.url);
    const content = await response.text();

    expect(content).toBe(anHtmlString);
  });

  it("close deletes the temporary directory", async () => {
    await contentServer.start(anHtmlString);
    const workingDirectory = contentServer.workingDirectory;
    await contentServer.close();

    expect(workingDirectory).toNotExist();
    expect(contentServer.workingDirectory).toBeUndefined();
  });
});

function toExist(actual) {
  const pass = fs.existsSync(actual);
  return {
    message: () => `expected ${actual} to exist`,
    pass: pass,
  };
}

function toHaveContent(file, expected) {
  const actual = fs.readFileSync(file).toString();
  const pass = actual === expected;
  return {
    message: () =>
      `expected ${file} to contain ${this.utils.printExpected(
        expected
      )} but was ${this.utils.printReceived(actual)}`,
    pass: pass,
  };
}

function toNotExist(actual) {
  const pass = !fs.existsSync(actual);
  return {
    message: () => `expected ${this.utils.printReceived(actual)} to NOT exist`,
    pass: pass,
  };
}

expect.extend({
  toExist,
  toNotExist,
  toHaveContent,
});
