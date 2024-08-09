import fastify from "fastify";
import { compare } from "./compare.js";
import { render } from "./render.js";

export function buildFastify(renderFn, compareFn) {
  const server = fastify({
    bodyLimit: 512 * 1024 * 1024, // 512MB
  });

  server.addSchema({
    $id: "#viewport",
    type: "object",
    properties: {
      height: { type: "number" },
      width: { type: "number" },
    },
    required: ["height", "width"],
  });

  server.addSchema({
    $id: "#check-request",
    type: "object",
    properties: {
      expected: { type: "string" },
      actualHtml: { type: "string" },
      fullpage: { type: "boolean" },
      viewport: { $ref: "#viewport" },
      style: { type: "string" },
    },
    required: ["actualHtml", "expected", "viewport"],
  });

  server.addSchema({
    $id: "#render-request",
    type: "object",
    properties: {
      actualHtml: { type: "string" },
      fullpage: { type: "boolean" },
      viewport: { $ref: "#viewport" },
      style: { type: "string" },
    },
    required: ["actualHtml", "viewport"],
  });

  server.post("/check", {
    schema: {
      body: {
        $ref: "#check-request",
      },
    },
    handler: async (request) => {
      const expected = Buffer.from(request.body.expected, "base64");
      const actualHtml = request.body.actualHtml;
      const viewport = request.body.viewport;
      const fullpage = request.body.fullpage ?? false;
      const style = request.body.style;

      const actual = await renderFn(actualHtml, viewport, fullpage, style);
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
      const viewport = request.body.viewport;
      const fullpage = request.body.fullpage ?? false;
      const style = request.body.style;

      const actual = await renderFn(actualHtml, viewport, fullpage, style);

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
