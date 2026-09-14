# Acceptance tests

Black-box tests that drive the **docker image** over HTTP against a growing set
of golden samples. They exist so a dependency bump that changes rendering, the
API, or the logging cannot reach ghcr.io unnoticed — which is what makes
Renovate's automerge safe.

Unit and integration tests (`npm test`) cover `src/` on the host. These cover
the artifact users actually run. Nothing in here imports from `src/`.

## Running

```bash
npm run test:acceptance         # assert against the goldens
npm run test:acceptance -- -u    # regenerate them
```

The image is built once per run and left cached. To drive an image you already
have — this is what CI does — pass it in:

```bash
PIXELPACT_IMAGE=pixelpact:ci npm run test:acceptance
```

An image passed in this way is never rebuilt or removed.

Goldens follow vitest's own snapshot rules: `-u` rewrites them, a normal local
run fills in whatever is missing, and on CI a missing golden is a failure.

## What a case looks like

One directory per case, and the case _is_ a vitest test. It says what to do; it
asserts nothing.

```js
import { pixelpactCase } from "../../lib/pixelpact.js";

const { scenario, render, check, fixture } = pixelpactCase(import.meta.dirname);
const viewport = { width: 800, height: 600 };

scenario("checks a rendered page against itself", async () => {
  const actualHtml = fixture("input.mhtml");

  const reference = await render({ actualHtml, viewport });
  await check({ actualHtml, expected: reference.png, viewport });
});
```

`pixelpactCase(dir, env?)` gives you:

|                                                       |                                         |
| ----------------------------------------------------- | --------------------------------------- |
| `scenario(name, body)`                                | `it` plus the golden pinning            |
| `render({ actualHtml, viewport, fullpage?, style? })` | `{ status, body, png }`                 |
| `check({ actualHtml, expected, viewport, ... })`      | `{ status, body, png, expected, diff }` |
| `post(route, body)`                                   | raw escape hatch                        |
| `fixture(relativePath)`                               | a `Buffer` read next to the case        |

Buffers in, Buffers out — base64 never appears in a case. Nothing throws on a
non-2xx; the status is simply part of what gets pinned. `env` defaults to
`{ LOG_LEVEL: "debug" }`.

Each test gets its own container on an ephemeral port, so the whole log stream
belongs to that one test and cases cannot leak into each other.

### Two rules

- **One `scenario` per case file.** Goldens are flat under `golden/`, so a second
  one would collide. A variant is a new case directory.
- **Never hand-edit `golden/`.** It is generated output; review it in the diff.

## What gets pinned

Everything the case did, without the case naming any of it:

```
cases/form/golden/
  transcript.json           every request and response, payloads elided
  01-render.actual.png      each response payload, byte-exact
  02-check.actual.png
  02-check.expected.png
  02-check.diff.png
  logs.jsonl                the container's whole log stream, normalized
```

`transcript.json` also records the container's exit code, so a broken shutdown
path shows up. Response payloads over 256 bytes become a descriptor plus their
own file:

```json
"actual": "<png 13500 bytes sha256:db92d1ea66e2 -> 01-render.actual.png>"
```

Request payloads get a descriptor but no file — they are either a fixture in
this repository or a previous response, and the sha makes that linkage visible.

### Why byte-exact pixels work

Goldens are only ever generated inside the image. There is no host-rendering
path, so fontconfig and the bundled browser are fixed and a render is
reproducible. A PNG that changes by one byte is a real change worth looking at.

### What the logs drop, and why

`time`, `pid` and `hostname` go away. Values that differ on every run are
replaced by a placeholder rather than removed, so the _field_ stays pinned and
one appearing or disappearing is still a failure:

- `responseTime` and anything `*DurationMs` → `<ms>`
- `req.host` → `<host>`, `remoteAddress` → `<address>`, `remotePort` → `<port>`
- the render workspace (a fresh `mkdtemp`) → `<workspace>`
- the listen address → `<address>`

Stable values stay verbatim on purpose. `browserVersion` is the useful one: it
is how a playwright bump announces itself.

A line that is not JSON is kept as `{"raw": "..."}` rather than dropped — a
stray `console.log` or a half-formatted stack is broken logging and should fail.
Anything on stderr is marked `{"stream": "stderr"}`; it means a crash, not
logging.

Readiness is detected by waiting for the server's own "Server listening" line
instead of probing a route, so no harness request pollutes the log golden or
shifts the request ids. A case therefore has to run at a level where `info` is
emitted.

## Adding a case

1. `mkdir cases/<name>/` and drop in an `input.mhtml`.
2. Write `case.test.js` as above.
3. `npm run test:acceptance -- -u`.
4. **Read the generated goldens** before committing. That review is the test.

To produce an `input.mhtml`, either save a page from Chrome DevTools
(⋮ → More tools → Save page as → Webpage, Single File) or call the CDP
`Page.captureSnapshot` the way `clients/js/playwright` does.

`.gitattributes` pins `*.mhtml` to CRLF — MIME boundary parsing depends on it,
so keep an editor from rewriting the line endings.

A case that needs no fixture of its own can read another's:
`fixture("../plain/input.mhtml")`. What a case must **not** do is read another
case's golden — every case renders its own reference, so goldens stay pure
outputs that regenerate in any order.

## When something fails

Text goldens diff inline in the vitest output. For a PNG, both sides plus a
pixelmatch visualisation land in `acceptance/out/<case>/` (gitignored; CI
uploads it as the `acceptance-failures` artifact).
