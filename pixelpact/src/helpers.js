export function getLocalAddress(fastifyInstance) {
  const address = fastifyInstance.addresses().find((e) => e.family === "IPv4");
  if (address === undefined) {
    throw Error("Failed to obtain address from fastify instance");
  }
  return `http://${address["address"]}:${address["port"]}`;
}
