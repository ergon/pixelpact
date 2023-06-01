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

  describe("POST /", () => {
    it("returns 400 when actualHtml is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/",
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
        url: "/",
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
        url: "/",
        payload: {
          actualHtml: "<h1>Hello World</h1>",
          expected: expected,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.expected).toBe(expected);
      expect(body.actual).toBe(actual);
      expect(body.diff).toBe(diff);
      expect(body.numDiffPixels).toBe(42);
    });
  });
});

async function mockRender(actualHtml) {
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
