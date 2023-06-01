import fastify from "fastify";
import { compare } from "./compare.js";
import { render } from "./render.js";

export function buildFastify(renderFn, compareFn) {
  const server = fastify();

  server.addSchema({
    $id: "#check-request",
    type: "object",
    properties: {
      actualHtml: { type: "string" },
      expected: { type: "string" },
    },
    required: ["actualHtml", "expected"],
  });

  server.addSchema({
    $id: "#render-request",
    type: "object",
    properties: {
      actualHtml: { type: "string" },
    },
    required: ["actualHtml"],
  });

  server.post("/check", {
    schema: {
      body: {
        $ref: "#check-request",
      },
    },
    handler: async (request) => {
      const actualHtml = request.body.actualHtml;
      const expected = Buffer.from(request.body.expected, "base64");

      const actual = await renderFn(actualHtml);
      const result = await compareFn(expected, actual);

      return {
        actual: result.actual.toString("base64"),
        expected: result.expected.toString("base64"),
        diff: result.diff.toString("base64"),
        numDiffPixels: result.numDiffPixels,
      };
    },
  });

  server.post("/render", {
    schema: {
      body: {
        $ref: "#render-request",
      },
    },
    handler: async (request) => {
      const actualHtml = request.body.actualHtml;

      const actual = await renderFn(actualHtml);

      return {
        actual: actual.toString("base64"),
      };
    },
  });

  return server;
}

export async function startApiServer(port = 8888) {
  const instance = buildFastify(render, compare);
  await instance.listen({ host: "0.0.0.0", port: port });
  return instance;
}
