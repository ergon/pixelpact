{
  description = "Pixelpact Project Flake";

  inputs = {
    nixpkgs.url = "https://channels.nixos.org/nixos-unstable/nixexprs.tar.zst";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    nixpkgs,
    flake-utils,
    ...
  }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = import nixpkgs {
        inherit system;
      };
      nodejs = pkgs.nodejs;
      # Playwright's prebuilt chromium is not patchelf'ed for nix; give it its shared libs.
      # Keep in sync with: ldd chrome-headless-shell | grep 'not found'
      chromium-libs = pkgs.lib.makeLibraryPath (with pkgs; [
        alsa-lib
        at-spi2-core
        dbus
        expat
        glib
        libgbm
        libx11
        libxcb
        libxcomposite
        libxdamage
        libxext
        libxfixes
        libxkbcommon
        libxrandr
        nspr
        nss
        systemd
      ]);
      start-server = pkgs.writeShellScriptBin "start-server" ''cd $REPOSITORY_ROOT/pixelpact; npm run start'';
      start-server-docker = pkgs.writeShellScriptBin "start-server-docker" ''cd $REPOSITORY_ROOT/pixelpact; docker compose up --build'';
    in {
      devShells.default = pkgs.mkShellNoCC {
        buildInputs = [nodejs start-server start-server-docker];
        shellHook = ''
          export REPOSITORY_ROOT=$(pwd)
          export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
          export LD_LIBRARY_PATH="${chromium-libs}''${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
          ln -fs "$REPOSITORY_ROOT/bin/pre-commit" "$REPOSITORY_ROOT/.git/hooks/pre-commit"
        '';
      };

      formatter = pkgs.alejandra;
    });
}
