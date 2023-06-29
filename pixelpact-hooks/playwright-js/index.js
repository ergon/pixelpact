import { readFileSync, existsSync, mkdirSync } from "fs";
import fs from "fs/promises";
import { dirname, resolve } from "path";

const appDir = process.env.PWD;
const data = JSON.parse(
  readFileSync(`${appDir}/pixelpact.config.json`, {
    encoding: "utf8",
    flag: "r",
  })
);

const mimeType = "image/png";
const fallbackFolderPath = `${appDir}/pixelpact/`;

export async function toMatchVisually(page, testInfo, fileNamePrefix) {
  const serverUrl = data.serverUrl;
  const folderPath = getFolderPath();

  if (!existsSync(folderPath)) {
    mkdirSync(folderPath);
  }

  const session = await page.context().newCDPSession(page);
  const mhtml = (
    await session.send("Page.captureSnapshot", { format: "mhtml" })
  ).data;

  if (data.mode === "record") {
    const referenceFileName = composeFileName(fileNamePrefix, "expected");
    const referenceFilePath = folderPath + referenceFileName;
    const referenceImage = await render(mhtml, page);
    await fs.writeFile(referenceFilePath, referenceImage);
  } else if (data.mode === "verify") {
    await toExpect(page, testInfo, fileNamePrefix, mhtml);
  } else {
    throw Error("Unknown Mode!");
  }
}

async function render(actualHtml, page) {
  const serverUrl = data.serverUrl;

  const body = {
    actualHtml,
    viewport: page.viewportSize(),
  };

  const response = await fetch(`${serverUrl}/render`, {
    method: "post",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

  const result = await response.json();
  return Buffer.from(result.actual, "base64");
}

async function toExpect(page, testInfo, fileNamePrefix, mhtml) {
  const serverUrl = data.serverUrl;
  const folderPath = getFolderPath();

  const referenceFileName = composeFileName(fileNamePrefix, "expected");
  const referenceFilePath = folderPath + referenceFileName;
  const referenceImage = await fs.readFile(referenceFilePath);
  const body = {
    actualHtml: mhtml,
    expected: referenceImage.toString("base64"),
    viewport: page.viewportSize(),
  };

  const response = await fetch(serverUrl + "/check", {
    method: "post",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
  const result = await response.json();

  const expectedFileName = composeFileName(fileNamePrefix, "expected");
  const expectedFilePath = folderPath + expectedFileName;
  await fs.writeFile(expectedFilePath, Buffer.from(result.expected, "base64"));
  testInfo.attachments.push({
    name: expectedFileName,
    contentType: mimeType,
    path: expectedFilePath,
  });

  const actualFileName = composeFileName(fileNamePrefix, "actual");
  const actualFilePath = folderPath + actualFileName;
  await fs.writeFile(actualFilePath, Buffer.from(result.actual, "base64"));
  testInfo.attachments.push({
    name: actualFileName,
    contentType: mimeType,
    path: actualFilePath,
  });

  const diffFileName = composeFileName(fileNamePrefix, "diff");
  const diffFilePath = folderPath + diffFileName;
  await fs.writeFile(diffFilePath, Buffer.from(result.diff, "base64"));
  testInfo.attachments.push({
    name: diffFileName,
    contentType: mimeType,
    path: diffFilePath,
  });

  if (result.numDiffPixels !== 0) {
    throw Error("Missmatch!");
  }
}

function getFolderPath() {
  if (data.folderPath) {
    return data.folderPath.endsWith("/")
      ? data.folderPath
      : `${data.folderPath}/`;
  }
  return fallbackFolderPath;
}

function composeFileName(fileNamePrefix, suffix) {
  return `${fileNamePrefix}_${suffix}.png`;
}
