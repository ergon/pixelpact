import fs from "fs/promises";
import { compare } from "./compare.js";
import { PNG } from "pngjs";

describe("compare", () => {
  it("returns the number of pixels that differ", async () => {
    const expected = await fs.readFile("testdata/simple-expected.png");
    const actual = await fs.readFile("testdata/simple-actual.png");
    const expectedDiff = await fs.readFile("testdata/simple-diff.png");

    const result = await compare(expected, actual);

    expect(result.numDiffPixels).toBe(152);
    expect(result.expected).toStrictEqual(expected);
    expect(result.actual).toStrictEqual(actual);
    expect(result.diff).toStrictEqual(expectedDiff);
  });

  it("enlarges images to be able to create diffs", async () => {
    const expected = emptyPNG(1920, 1024);
    const actual = emptyPNG(2000, 800);

    const result = await compare(expected, actual);

    const diff = PNG.sync.read(result.diff);
    expect(diff.width).toStrictEqual(2000);
    expect(diff.height).toStrictEqual(1024);
  });
});

function emptyPNG(width, height) {
  const png = new PNG({ width, height });
  return PNG.sync.write(png);
}
