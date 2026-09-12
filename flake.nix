{
  description = "Pixelpact Project Flake";

  inputs = {
    nixpkgs.url = "https://channels.nixos.org/nixos-unstable/nixexprs.tar.zst";

    flake-parts.url = "github:hercules-ci/flake-parts";
    flake-parts.inputs.nixpkgs-lib.follows = "nixpkgs";

    nix-shell-parts.url = "github:ergon/nix-shell-parts";
    nix-shell-parts.inputs.nixpkgs.follows = "nixpkgs";
    nix-shell-parts.inputs.flake-parts.follows = "flake-parts";
  };

  outputs = inputs @ {flake-parts, ...}:
    flake-parts.lib.mkFlake {inherit inputs;} {
      imports = [inputs.nix-shell-parts.flakeModules.default];

      perSystem = {
        pkgs,
        lib,
        ...
      }: let
        isLinux = pkgs.stdenv.hostPlatform.isLinux;
        # Playwright's prebuilt chromium is not patchelf'ed for nix; give it its shared libs.
        # `check-chromium-libs`  reports drift in this list.
        chromium-libs = lib.makeLibraryPath (with pkgs; [
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
      in {
        formatter = pkgs.alejandra;

        shells.default = {
          packages = [pkgs.nodejs];

          scripts =
            {
              start-server.text = ''cd "$REPOSITORY_ROOT/server"; npm run start'';
              start-server-docker.text = ''cd "$REPOSITORY_ROOT/server"; docker compose up --build'';
            }
            // lib.optionalAttrs isLinux {
              # Reports sonames the installed browsers need but chromium-libs does not provide.
              check-chromium-libs.text = ''
                shopt -s nullglob
                browsers="''${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"
                binaries=("$browsers"/chromium*/*/chrome "$browsers"/chromium*/*/chrome-headless-shell)
                if [ ''${#binaries[@]} -eq 0 ]; then
                  echo "check-chromium-libs: no browsers in $browsers - run 'npx playwright install'" >&2
                  exit 0
                fi
                missing=$(ldd "''${binaries[@]}" 2>/dev/null | { grep 'not found' || true; } | awk '{print $1}' | sort -u)
                if [ -n "$missing" ]; then
                  echo "check-chromium-libs: chromium-libs in flake.nix is missing:" >&2
                  echo "$missing" >&2
                  exit 1
                fi
              '';
            };

          env.PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = "true";

          shellHook =
            ''
              export REPOSITORY_ROOT=$(pwd)
              ln -fs "$REPOSITORY_ROOT/bin/pre-commit" "$REPOSITORY_ROOT/.git/hooks/pre-commit"
            ''
            + lib.optionalString isLinux ''
              export LD_LIBRARY_PATH="${chromium-libs}''${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
              check-chromium-libs || true
            '';
        };
      };
    };
}
