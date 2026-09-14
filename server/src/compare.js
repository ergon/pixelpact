import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { logger } from "./logger.js";

const defaultOptions = { threshold: 0.01 };

export async function compare(expected, actual, options = {}, log = logger) {
  const expectedPng = PNG.sync.read(expected);
  const actualPng = PNG.sync.read(actual);
  const diffDimensions = {
    width: Math.max(expectedPng.width, actualPng.width),
    height: Math.max(expectedPng.height, actualPng.height),
  };

  if (
    expectedPng.width !== actualPng.width ||
    expectedPng.height !== actualPng.height
  ) {
    log.warn(
      {
        expected: { width: expectedPng.width, height: expectedPng.height },
        actual: { width: actualPng.width, height: actualPng.height },
        diff: diffDimensions,
      },
      "Expected and actual differ in size, padding both before comparing",
    );
  }

  const resizedExpectedPng = createResized(expectedPng, diffDimensions);
  const resizedActualPng = createResized(actualPng, diffDimensions);
  const diffPng = new PNG(diffDimensions);
  const numDiffPixels = pixelmatch(
    resizedExpectedPng.data,
    resizedActualPng.data,
    diffPng.data,
    diffDimensions.width,
    diffDimensions.height,
    { ...defaultOptions, ...options },
  );
  const diff = PNG.sync.write(diffPng);

  return {
    numDiffPixels,
    expected,
    actual,
    diff,
  };
}

/** Cretes a copy of {@link img}, with the {@link dimensions}.
 * @param {PNG} img
 * @param {{width: number, height: number}} dimensions
 * @returns {PNG}
 */
function createResized(img, dimensions) {
  if (img.width > dimensions.width || img.height > dimensions.height) {
    throw new Error(
      `New dimensions expected to be greater than or equal to the original dimensions!`,
    );
  }
  const resized = new PNG(dimensions);
  PNG.bitblt(img, resized, 0, 0, img.width, img.height);

  return resized;
}
