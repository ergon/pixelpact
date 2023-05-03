import fastify from "fastify";
import { snapshot } from "./snapshot.js";

const server = fastify({ logger: false });

server.post("/", async (request) => {
  let actualHtml = request.body.actualHtml;
  let expected = Buffer.from(request.body.expected, "base64");

  let result = await snapshot(expected, actualHtml);

  return {
    actual: result.actual.toString("base64"),
    expected: result.expected.toString("base64"),
    diff: result.diff.toString("base64"),
    numDiffPixels: result.numDiffPixels,
  };
});

export async function startApiServer() {
  await server.listen({ host: "0.0.0.0", port: 8888 }, (error, address) => {
    if (error != null) {
      console.error(error);
    }

    console.info(`Starting server @ ${address}`);
  });
}
