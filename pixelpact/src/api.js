import fastify from "fastify";
import { compare } from "./compare.js";
import { render } from "./render.js";

export function buildFastify(renderFn, compareFn) {
  const server = fastify({ logger: false });

  server.addSchema({
    $id: "#request",
    type: "object",
    properties: {
      actualHtml: { type: "string" },
      expected: { type: "string" },
    },
    required: ["actualHtml", "expected"],
  });

  server.post("/", {
    schema: {
      body: {
        $ref: "#request",
      },
    },
    handler: async (request) => {
      let actualHtml = request.body.actualHtml;
      let expected = Buffer.from(request.body.expected, "base64");

      let actual = await renderFn(actualHtml);
      let result = await compareFn(expected, actual);

      return {
        actual: result.actual.toString("base64"),
        expected: result.expected.toString("base64"),
        diff: result.diff.toString("base64"),
        numDiffPixels: result.numDiffPixels,
      };
    },
  });
  return server;
}

export async function startApiServer() {
  await buildFastify(render, compare).listen(
    { host: "0.0.0.0", port: 8888 },
    (error, address) => {
      if (error != null) {
        console.error(error);
      }
      console.info(`Starting server @ ${address}`);
    }
  );
}
