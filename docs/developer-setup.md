# Developer setup

For a fast and reliable developer experience, we recommend to use [NIX](https://nixos.org/download.html) and [direnv](https://direnv.net/docs/installation.html) (+[nix-direnv](https://github.com/nix-community/nix-direnv)).

This allows you to get started by just running:

```bash
cd path/to/pixelpact
direnv allow
cd server
npm ci
start-server
```
