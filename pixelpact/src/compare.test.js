import fs from "fs/promises";
import { compare } from "./compare.js";

describe("compare", () => {
  it("returns the number of pixels that differ", async () => {
    let expected = await fs.readFile("testdata/simple-expected.png");
    let actual = await fs.readFile("testdata/simple-actual.png");
    let expectedDiff = await fs.readFile("testdata/simple-diff.png");

    let result = await compare(expected, actual);

    expect(result.numDiffPixels).toBe(152);
    expect(result.expected).toStrictEqual(expected);
    expect(result.actual).toStrictEqual(actual);
    expect(result.diff).toStrictEqual(expectedDiff);
  });
});
