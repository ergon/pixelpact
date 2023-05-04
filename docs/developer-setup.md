# Developer setup

For a fast and reliable developer experience, we recommend to use [NIX](https://nixos.org/download.html) and [direnv](https://direnv.net/docs/installation.html) (+[nix-direnv](https://github.com/nix-community/nix-direnv)).

This allows you to get started by just running:

```bash
cd path/to/pixelpact
direnv allow
cd pixelpact
npm install
start-server
```

Alternatively, you can manually install node, for example using [nvm](https://github.com/nvm-sh/nvm).

## Pixelpact

The core of Pixelpact is located in the `pixelpact/` directory. To start the server, use the `start` script:

```bash
cd pixelpact/
npm install
npm start
```
