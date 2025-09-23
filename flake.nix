{
  description = "Pixelpact Project Flake";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-24.11";
    flake-utils.url = "github:numtide/flake-utils";
    playwright.url = "github:pietdevries94/playwright-web-flake/1.55.1";
  };

  outputs = {
    nixpkgs,
    flake-utils,
    playwright,
    ...
  }:
    flake-utils.lib.eachDefaultSystem (system: let
      overlay = final: prev: {
        inherit (playwright.packages.${system}) playwright-test playwright-driver;
      };
      pkgs = import nixpkgs {
        inherit system;
        overlays = [overlay];
      };
      nodejs = pkgs.nodejs_20;
      start-server = pkgs.writeShellScriptBin "start-server" ''cd $REPOSITORY_ROOT/pixelpact; npm run start'';
      start-server-docker = pkgs.writeShellScriptBin "start-server-docker" ''cd $REPOSITORY_ROOT/pixelpact; docker compose up --build'';
    in {
      devShells.default = pkgs.mkShellNoCC {
        buildInputs = with pkgs; [nodejs start-server start-server-docker];
        shellHook = ''
          export REPOSITORY_ROOT=$(pwd)
          export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers}
          export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
          export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=true
          ln -fs "$REPOSITORY_ROOT/bin/pre-commit" "$REPOSITORY_ROOT/.git/hooks/pre-commit"
        '';
      };

      formatter = pkgs.alejandra;
    });
}
