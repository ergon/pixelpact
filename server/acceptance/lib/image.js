import path from "node:path";
import { docker } from "./container.js";

const BUILT_TAG = "pixelpact:acceptance";

/** vitest `globalSetup`: settles which image the suite drives and whether
 * goldens may be written, then hands both to the cases via `inject()`.
 *
 * CI builds the image once and passes it in via `PIXELPACT_IMAGE`; locally we
 * build it ourselves and leave it in place so the next run is warm.
 */
export default async function setup(project) {
  const provided = process.env.PIXELPACT_IMAGE;
  if (provided) {
    // Fail loudly here rather than once per case with a confusing `docker run` error.
    await docker(["image", "inspect", provided]);
  } else {
    const serverDirectory = path.resolve(import.meta.dirname, "../..");
    await docker(["build", "--tag", BUILT_TAG, serverDirectory], {
      stream: true,
    });
  }

  project.provide("image", provided ?? BUILT_TAG);
  // "all" with -u, "new" locally (write what is missing), "none" on CI (missing is a failure).
  project.provide(
    "updateSnapshot",
    project.config.snapshotOptions.updateSnapshot,
  );
}
