import { test } from "@playwright/test";
import { toMatchVisually } from "@pixelpact-hook/playwright-js";

test.use({
  locale: "de-CH",
  video: "on",
  trace: "on",
  reporter: "html",
});

import fs from "fs/promises";

test("verify site visually", async ({ page, browser }, testInfo) => {
  await page.goto(
    "https://web.archive.org/web/20230801105641/https://www.ergon.ch/de/themen",
    {
      waitUntil: "networkidle",
    }
  );

  await toMatchVisually(page, testInfo, "ArchivedErgonWebsite");
});
