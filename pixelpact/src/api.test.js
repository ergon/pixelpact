import { buildFastify } from "./api.js";

describe("", () => {
  setupServer();
  describe("POST /", () => {
    it("returns 400 when actualHtml is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/",
        payload: {
          expected: "ZXhwZWN0ZWQK",
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
          expected: "ZXhwZWN0ZWQK",
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.expected).toBe("ZXhwZWN0ZWQK");
      expect(body.actual).toBe("YWN0dWFsCg==");
      expect(body.diff).toBe("ZGlmZgo=");
      expect(body.numDiffPixels).toBe(42);
    });
  });
});

let app = undefined;
function setupServer() {
  beforeAll(async () => {
    app = buildFastify(mockSnapshot);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    app = undefined;
  });
}

function mockSnapshot(expected, actualHtml, options) {
  return {
    numDiffPixels: 42,
    expected: expected,
    actual: Buffer.from("YWN0dWFsCg==", "base64"),
    diff: Buffer.from("ZGlmZgo=", "base64"),
  };
}
