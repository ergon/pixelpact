import { test } from "@playwright/test";
import { toMatchVisually } from "@pixelpact-hook/playwright-js";

test.use({
  viewport: { width: 1920, height: 1024 },
  locale: "de-CH",
  video: "on",
  trace: "on",
  reporter: "html",
});

import fs from "fs/promises";

test("verify site visually", async ({ page, browser }, testInfo) => {
  await page.goto("https://www.ergon.ch/de/themen", {
    waitUntil: "networkidle",
  });

  await toMatchVisually(page, testInfo, "ErgonWebsite");
});
