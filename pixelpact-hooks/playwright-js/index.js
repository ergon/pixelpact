import { readFileSync, existsSync } from "fs";
import { dirname, resolve } from "path";

const appDir = process.env.PWD;
const data = readFileSync(`${appDir}/pixelpact.config.json`, {
  encoding: "utf8",
  flag: "r",
});

const mimeType = "image/png";
const fallbackFolderPath = `${appDir}/pixelpact/`;

export async function toMatchVisually(page, testInfo, fileNamePrefix) {
  const serverUrl = data.serverUrl;
  const folderPath = getFolderPath();

  if (!existsSync(folderPath)) {
    mkdirSync(folderPath);
  }

  const session = await page.context().newCDPSession(page);
  const mhtml = await session.send("Page.captureSnapshot", { format: "mhtml" });

  const body = {
    actualHtml: mhtml,
    expected: referenceImage.toString("base64"),
    viewport: { width: 1920, height: 1024 },
    context: context.toString("base64"),
  };

  const response = await fetch(serverUrl, {
    method: "post",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
  const result = await response.json();

  const expectedFileName = composeFileName(fileNamePrefix, "expected");
  const expectedFilePath = folderPath + actualFileName;
  await fs.writeFile(expectedFilePath, Buffer.from(result.expected, "base64"));
  testInfo.attachments.push({
    name: expectedFileName,
    contentType: mimeType,
    path: expectedFileName,
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
