# Developer setup

For a fast and reliable developer experience, we recommend to use [NIX](https://nixos.org/download.html) and [direnv](https://direnv.net/docs/installation.html) (+[nix-direnv](https://github.com/nix-community/nix-direnv)).

This allows you to get started by just running:

```bash
cd path/to/pixelpact
direnv allow
cd server
npm ci
npx playwright install chromium-headless-shell
start-server
```

## Tests

```bash
cd server
npm test               # unit and integration tests against src/
npm run test:acceptance # black-box tests against the docker image
```

The acceptance suite builds the image and drives it over HTTP against a set of
golden samples. It needs docker, and it is what gates the published image in CI.
See [server/acceptance/README.md](../server/acceptance/README.md).
