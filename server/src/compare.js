import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

export async function compare(expected, actual, options = { threshold: 0.01 }) {
  const expectedPng = PNG.sync.read(expected);
  const actualPng = PNG.sync.read(actual);
  const diffDimensions = {
    width: Math.max(expectedPng.width, actualPng.width),
    height: Math.max(expectedPng.height, actualPng.height),
  };
  const resizedExpectedPng = createResized(expectedPng, diffDimensions);
  const resizedActualPng = createResized(actualPng, diffDimensions);
  const diffPng = new PNG(diffDimensions);
  const numDiffPixels = pixelmatch(
    resizedExpectedPng.data,
    resizedActualPng.data,
    diffPng.data,
    diffDimensions.width,
    diffDimensions.height,
    options,
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
