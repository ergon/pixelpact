import Fastify from "fastify";
import { snapshot } from "./snapshot.js";

export async function main() {
  const fastify = Fastify({ logger: false });
  fastify.post("/", async (request, reply) => {
    let actualHtml = request.body.actualHtml;
    let expected = Buffer.from(request.body.expected, "base64");
    let result = await snapshot(expected, actualHtml, {
      threshold: 0.01,
    });

    return {
      actual: result.actual.toString("base64"),
      expected: result.expected.toString("base64"),
      diff: result.diff.toString("base64"),
      numDiffPixels: result.numDiffPixels,
    };
  });

  await fastify.listen({ host: "0.0.0.0", port: 8888 });
  console.log("Running!");
}
