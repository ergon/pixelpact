{
  pkgs,
  lib,
  config,
  ...
}: let
  cfg = config.playwright;
  # Playwright's prebuilt chromium is not patchelf'ed for nix; give it its shared libs.
  # `check-chromium-libs` reports drift in this list.
  chromium-libs = lib.makeLibraryPath cfg.chromium-libs;
in {
  options.playwright = {
    enable = lib.mkEnableOption "playwright browsers downloaded by `npx playwright install`";

    chromium-libs = lib.mkOption {
      type = lib.types.listOf lib.types.package;
      description = ''
        Shared libraries put on `LD_LIBRARY_PATH` so playwright's prebuilt chromium runs on linux.

        `check-chromium-libs` reports sonames the installed browsers need but this list does not provide.
      '';
      default = with pkgs; [
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
      ];
    };
  };

  # Playwright only validates host requirements and needs the shared libs on linux.
  config = lib.mkIf (cfg.enable && pkgs.stdenv.hostPlatform.isLinux) {
    scripts = {
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
          echo "check-chromium-libs: playwright.chromium-libs is missing:" >&2
          echo "$missing" >&2
          exit 1
        fi
      '';
    };

    # Only NixOS lacks the system libraries the prebuilt chromium is linked against.
    # Other distros (CI runners, ubuntu dev machines) have them, and mixing them with
    # nixpkgs' libraries breaks chromium: their glibc is older than the one nixpkgs
    # builds against (`GLIBC_ABI_GNU2_TLS not found`).
    shellHook = ''
      if [ -e /etc/NIXOS ]; then
        export LD_LIBRARY_PATH="${chromium-libs}''${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
        # Playwright's host requirements are debian packages, which NixOS never has.
        export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
        check-chromium-libs || true
      fi
    '';
  };
}
