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
    const referenceFileName = composeFileName(fileNamePrefix, "expected");
    const referenceFilePath = folderPath + referenceFileName;
    const referenceImage = await render(mhtml, page);
    await fs.writeFile(referenceFilePath, referenceImage);
  } else if (config.mode === "verify") {
    await verfiy(page, testInfo, fileNamePrefix, mhtml);
  } else {
    throw Error("Unknown Mode!");
  }
}

async function render(actualHtml, page) {
  const body = {
    actualHtml,
    viewport: page.viewportSize(),
  };

  const response = await fetch(`${config.serverUrl}/render`, {
    method: "post",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

  const result = await response.json();
  return Buffer.from(result.actual, "base64");
}

async function verfiy(page, testInfo, fileNamePrefix, mhtml) {
  const referenceFileName = composeFileName(fileNamePrefix, "expected");
  const referenceFilePath = folderPath + referenceFileName;
  const referenceImage = await fs.readFile(referenceFilePath);
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

  saveResult(result.expected, testInfo, fileNamePrefix, "expected");
  saveResult(result.actual, testInfo, fileNamePrefix, "actual");
  saveResult(result.diff, testInfo, fileNamePrefix, "diff");

  if (result.numDiffPixels !== 0) {
    throw Error("Missmatch!");
  }
}

async function saveResult(fileStr, testInfo, fileNamePrefix, fileNameSuffix) {
  const fileName = composeFileName(fileNamePrefix, fileNameSuffix);
  const filePath = folderPath + fileName;
  await fs.writeFile(filePath, Buffer.from(fileStr, "base64"));
  testInfo.attachments.push({
    name: fileName,
    contentType: "image/png",
    path: filePath,
  });
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
