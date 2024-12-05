import fastify from "fastify";
import { compare } from "./compare.js";
import { render } from "./render.js";
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
});

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
      usehMhtmlConverter: { type: "boolean" },
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
      usehMhtmlConverter: { type: "boolean" },
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
      const usehMhtmlConverter = request.body.usehMhtmlConverter ?? false;

      const actual = await renderFn(
        actualHtml,
        viewport,
        fullpage,
        style,
        usehMhtmlConverter,
      );
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
      const usehMhtmlConverter = request.body.usehMhtmlConverter ?? false;

      const actual = await renderFn(
        actualHtml,
        viewport,
        fullpage,
        style,
        usehMhtmlConverter,
      );

      return {
        actual: actual.toString("base64"),
      };
    },
  });

  server.setErrorHandler((error, request, reply) => {
    logger.error(error.message);
    const errorResponse = {
      message: error.message,
      error: error.error,
      statusCode: error.statusCode || 500,
    };
    reply.code(errorResponse.statusCode).send(errorResponse);
  });

  return server;
}

export async function startApiServer(port = 8888) {
  const instance = buildFastify(render, compare);
  await instance.listen({ host: "0.0.0.0", port: port });
  return instance;
}
