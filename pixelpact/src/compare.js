import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

export async function compare(expected, actual, options = { threshold: 0.01 }) {
  const { width, height, data: expectedPng } = PNG.sync.read(expected);
  const { data: actualPng } = PNG.sync.read(actual);
  const diffPng = new PNG({ width, height });
  const numDiffPixels = pixelmatch(
    expectedPng,
    actualPng,
    diffPng.data,
    width,
    height,
    options
  );
  const diff = PNG.sync.write(diffPng);

  return {
    numDiffPixels,
    expected,
    actual,
    diff,
  };
}
