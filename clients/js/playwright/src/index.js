import { existsSync, mkdirSync } from "fs";
import fs from "fs/promises";
import fetch from 'node-fetch';

const appDir = process.env.PWD;
const MODE = process.env.PIXELPACT_MODE ?? "verify";
const SERVER_URL = process.env.PIXELPACT_SERVER_URL ?? "http://localhost:8888";
const FOLDER_PATH = process.env.PIXELPACT_FOLDER_PATH;
const folderPath = getFolderPath();

const expectedFileSuffix = "expected";
const actualFileSuffix = "actual";
const diffFileSuffix = "diff";

export async function toMatchVisually(
  page,
  testInfo,
  fileNamePrefix,
  options = {}
) {
  if (!existsSync(folderPath)) {
    mkdirSync(folderPath);
  }

  const session = await page.context().newCDPSession(page);
  const mhtml = (
    await session.send("Page.captureSnapshot", { format: "mhtml" })
  ).data;

  if (MODE === "record") {
    await recordReferenceImage(mhtml, page, fileNamePrefix, options);
  } else if (MODE === "verify") {
    await verfiy(page, testInfo, fileNamePrefix, mhtml, options);
  } else {
    throw Error("Unknown Mode!");
  }
}

async function recordReferenceImage(mHtml, page, fileNamePrefix, options) {
  const referenceFileName = composeFileName(fileNamePrefix, "expected");
  const referenceFilePath = folderPath + referenceFileName;
  const body = {
    actualHtml: mHtml,
    viewport: page.viewportSize(),
    ...options,
  };

  const response = await fetch(`${SERVER_URL}/render`, {
    method: "post",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

  const result = await response.json();
  const referenceImage = Buffer.from(result.actual, "base64");
  await fs.writeFile(referenceFilePath, referenceImage);
}

async function verfiy(page, testInfo, fileNamePrefix, mhtml, options) {
  const referenceImage = await readReferenceImage(fileNamePrefix);
  const body = {
    actualHtml: mhtml,
    expected: referenceImage.toString("base64"),
    viewport: page.viewportSize(),
    ...options,
  };

  const response = await fetch(SERVER_URL + "/check", {
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
  if (FOLDER_PATH) {
    return FOLDER_PATH.endsWith("/") ? FOLDER_PATH : `${FOLDER_PATH}/`;
  }
  return `${appDir}/pixelpact/`;
}

function composeFileName(fileNamePrefix, suffix) {
  return `${fileNamePrefix}-${suffix}.png`;
}
