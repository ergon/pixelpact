import { buildFastify } from "./api.js";

let app = undefined;

const expected = "ZXhwZWN0ZWQK";
const actual = "YWN0dWFsCg==";
const diff = "ZGlmZgo=";

describe("api", () => {
  beforeEach(async () => {
    app = buildFastify(mockRender, mockCompare);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    app = undefined;
  });

  describe("POST /check", () => {
    it("returns 400 when actualHtml is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/check",
        payload: {
          expected: expected,
        },
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.message).toBe(
        "body must have required property 'actualHtml'"
      );
    });

    it("returns 400 when expected is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/check",
        payload: {
          actualHtml: "<h1>Hello World</h1>",
        },
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.message).toBe("body must have required property 'expected'");
    });

    it("returns result when all parameters are provided", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/check",
        payload: {
          actualHtml: "<h1>Hello World</h1>",
          expected: expected,
          viewport: { width: 1920, height: 1024 },
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(Object.keys(body).sort()).toEqual([
        "actual",
        "diff",
        "expected",
        "numDiffPixels",
      ]);
      expect(body.expected).toBe(expected);
      expect(body.actual).toBe(actual);
      expect(body.diff).toBe(diff);
      expect(body.numDiffPixels).toBe(42);
    });
  });

  describe("POST /render", () => {
    it("returns 400 when actualHtml is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/render",
        payload: {},
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.message).toBe(
        "body must have required property 'actualHtml'"
      );
    });

    it("returns result when all parameters are provided", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/render",
        payload: {
          actualHtml: "<h1>Hello World</h1>",
          viewport: { width: 1920, height: 1024 },
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(Object.keys(body).sort()).toEqual(["actual"]);
      expect(body.actual).toBe(actual);
    });
  });
});

async function mockRender(actualHtml, viewport) {
  return Buffer.from(actual, "base64");
}

function mockCompare(expected, actual, options) {
  return {
    numDiffPixels: 42,
    expected: expected,
    actual: actual,
    diff: Buffer.from(diff, "base64"),
  };
}
