import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

export async function compare(expected, actual, options = { threshold: 0.01 }) {
  const expectedPng = PNG.sync.read(expected);
  const actualPng = PNG.sync.read(actual);
  const { width, height } = expectedPng;
  const diffPng = new PNG({ width, height });
  const numDiffPixels = pixelmatch(
    expectedPng.data,
    actualPng.data,
    diffPng.data,
    width,
    height,
    options
  );
  const diff = PNG.sync.write(diffPng);

  return {
    numDiffPixels: numDiffPixels,
    expected: expected,
    actual: actual,
    diff: diff,
  };
}
