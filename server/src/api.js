import fastify from "fastify";
import { compare } from "./compare.js";
import { render } from "./render.js";
import { logger, measure } from "./logger.js";

export function buildFastify(renderFn, compareFn) {
  const server = fastify({
    bodyLimit: 512 * 1024 * 1024, // 512MB
    loggerInstance: logger,
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
      const log = request.log;
      const expected = Buffer.from(request.body.expected, "base64");
      const actualHtml = request.body.actualHtml;
      const viewport = request.body.viewport;
      const fullpage = request.body.fullpage ?? false;
      const style = request.body.style;
      const usehMhtmlConverter = request.body.usehMhtmlConverter ?? true;

      const [actual, renderDurationMs] = await measure(() =>
        renderFn(
          actualHtml,
          viewport,
          fullpage,
          style,
          usehMhtmlConverter,
          log,
        ),
      );
      const [result, compareDurationMs] = await measure(() =>
        compareFn(expected, actual, {}, log),
      );

      log.info(
        {
          viewport,
          fullpage,
          mhtmlConverter: usehMhtmlConverter,
          styled: style !== undefined,
          expectedBytes: expected.length,
          actualBytes: result.actual.length,
          numDiffPixels: result.numDiffPixels,
          renderDurationMs,
          compareDurationMs,
        },
        "Check completed",
      );

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
      const log = request.log;
      const actualHtml = request.body.actualHtml;
      const viewport = request.body.viewport;
      const fullpage = request.body.fullpage ?? false;
      const style = request.body.style;
      const usehMhtmlConverter = request.body.usehMhtmlConverter ?? true;

      const [actual, renderDurationMs] = await measure(() =>
        renderFn(
          actualHtml,
          viewport,
          fullpage,
          style,
          usehMhtmlConverter,
          log,
        ),
      );

      log.info(
        {
          viewport,
          fullpage,
          mhtmlConverter: usehMhtmlConverter,
          styled: style !== undefined,
          actualBytes: actual.length,
          renderDurationMs,
        },
        "Render completed",
      );

      return {
        actual: actual.toString("base64"),
      };
    },
  });

  server.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode || 500;
    if (statusCode >= 500) {
      // Our fault: keep the stack, it is the only lead we get.
      request.log.error({ err: error, statusCode }, "Request failed");
    } else {
      // Their fault: a stack trace of our own validation code helps nobody.
      request.log.warn(
        {
          statusCode,
          code: error.code,
          reason: error.message,
          validation: error.validation,
        },
        "Request rejected",
      );
    }

    const errorResponse = {
      message: error.message,
      error: error.error,
      statusCode,
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
