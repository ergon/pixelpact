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
      # `check-chromium-libs`  reports drift in this list.
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
      # Reports sonames the installed browsers need but chromium-libs does not provide.
      check-chromium-libs = pkgs.writeShellScriptBin "check-chromium-libs" ''
        set -o errexit -o nounset -o pipefail
        shopt -s nullglob
        browsers="''${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"
        binaries=("$browsers"/chromium*/*/chrome "$browsers"/chromium*/*/chrome-headless-shell)
        if [ ''${#binaries[@]} -eq 0 ]; then
          echo "check-chromium-libs: no browsers in $browsers - run 'npx playwright install'" >&2
          exit 0
        fi
        missing=$(ldd "''${binaries[@]}" 2>/dev/null | grep 'not found' | awk '{print $1}' | sort -u)
        if [ -n "$missing" ]; then
          echo "check-chromium-libs: chromium-libs in flake.nix is missing:" >&2
          echo "$missing" >&2
          exit 1
        fi
      '';
      start-server = pkgs.writeShellScriptBin "start-server" ''cd $REPOSITORY_ROOT/server; npm run start'';
      start-server-docker = pkgs.writeShellScriptBin "start-server-docker" ''cd $REPOSITORY_ROOT/server; docker compose up --build'';
    in {
      devShells.default = pkgs.mkShellNoCC {
        buildInputs = [nodejs check-chromium-libs start-server start-server-docker];
        shellHook = ''
          export REPOSITORY_ROOT=$(pwd)
          export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
          export LD_LIBRARY_PATH="${chromium-libs}''${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
          ln -fs "$REPOSITORY_ROOT/bin/pre-commit" "$REPOSITORY_ROOT/.git/hooks/pre-commit"
          check-chromium-libs || true
        '';
      };

      formatter = pkgs.alejandra;
    });
}
