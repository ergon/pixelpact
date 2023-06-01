import fs from "fs/promises";
import { compare } from "./compare.js";

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
});
