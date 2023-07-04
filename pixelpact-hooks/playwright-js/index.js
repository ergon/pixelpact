import { readFileSync, existsSync, mkdirSync } from "fs";
import fs from "fs/promises";
import { dirname, resolve } from "path";

const appDir = process.env.PWD;
const config = JSON.parse(
  readFileSync(`${appDir}/pixelpact.config.json`, {
    encoding: "utf8",
    flag: "r",
  })
);
const folderPath = getFolderPath();

const expectedFileSuffix = "expected";
const actualFileSuffix = "actual";
const diffFileSuffix = "expected";

export async function toMatchVisually(page, testInfo, fileNamePrefix) {
  const serverUrl = config.serverUrl;

  if (!existsSync(folderPath)) {
    mkdirSync(folderPath);
  }

  const session = await page.context().newCDPSession(page);
  const mhtml = (
    await session.send("Page.captureSnapshot", { format: "mhtml" })
  ).data;

  if (config.mode === "record") {
    await recordReferenceImage(mhtml, page, fileNamePrefix);
  } else if (config.mode === "verify") {
    await verfiy(page, testInfo, fileNamePrefix, mhtml);
  } else {
    throw Error("Unknown Mode!");
  }
}

async function recordReferenceImage(mHtml, page, fileNamePrefix) {
  const referenceFileName = composeFileName(fileNamePrefix, "expected");
  const referenceFilePath = folderPath + referenceFileName;
  const body = {
    actualHtml: mHtml,
    viewport: page.viewportSize(),
  };

  const response = await fetch(`${config.serverUrl}/render`, {
    method: "post",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

  const result = await response.json();
  const referenceImage = Buffer.from(result.actual, "base64");
  await fs.writeFile(referenceFilePath, referenceImage);
}

async function verfiy(page, testInfo, fileNamePrefix, mhtml) {
  const referenceImage = await readReferenceImage(fileNamePrefix);
  const body = {
    actualHtml: mhtml,
    expected: referenceImage.toString("base64"),
    viewport: page.viewportSize(),
  };

  const response = await fetch(config.serverUrl + "/check", {
    method: "post",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
  const result = await response.json();

  attachExpected(testInfo, fileNamePrefix);
  await saveResult(result.actual, testInfo, fileNamePrefix, actualFileSuffix);
  await saveResult(result.diff, testInfo, fileNamePrefix, diffFileSuffix);

  if (result.numDiffPixels !== 0) {
    throw Error(
      "Actual Image does not match reference image! Pixeldiff: " +
        result.numDiffPixels
    );
  }
}

async function saveResult(fileStr, testInfo, fileNamePrefix, fileNameSuffix) {
  const fileName = composeFileName(fileNamePrefix, fileNameSuffix);
  const filePath = folderPath + fileName;
  await fs.writeFile(filePath, Buffer.from(fileStr, "base64"));
  attachToTestInfo(testInfo, fileName, filePath);
}

function attachExpected(testInfo, fileNamePrefix) {
  const fileName = composeFileName(fileNamePrefix, expectedFileSuffix);
  const filePath = folderPath + fileName;
  attachToTestInfo(testInfo, fileName, filePath);
}

function attachToTestInfo(testInfo, fileName, filePath) {
  testInfo.attachments.push({
    name: fileName,
    contentType: "image/png",
    path: filePath,
  });
}

async function readReferenceImage(fileNamePrefix) {
  const referenceFileName = composeFileName(fileNamePrefix, expectedFileSuffix);
  const referenceFilePath = folderPath + referenceFileName;
  return await fs.readFile(referenceFilePath);
}

function getFolderPath() {
  if (config.folderPath) {
    return config.folderPath.endsWith("/")
      ? config.folderPath
      : `${config.folderPath}/`;
  }
  return `${appDir}/pixelpact/`;
}

function composeFileName(fileNamePrefix, suffix) {
  return `${fileNamePrefix}-${suffix}.png`;
}
