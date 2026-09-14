// Playwright writes this to stderr on every browser launch and offers no way to
// turn it off. The env variable is set on NixOS only, see nix/playwright.nix.
const noise = "Skipping host requirements validation logic";
const write = process.stderr.write.bind(process.stderr);

process.stderr.write = (chunk, encoding, callback) => {
  if (typeof chunk === "string" && chunk.startsWith(noise)) {
    const done = typeof encoding === "function" ? encoding : callback;
    done?.();
    return true;
  }
  return write(chunk, encoding, callback);
};
