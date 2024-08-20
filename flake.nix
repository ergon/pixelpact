{
  description = "Pixelpact Project Flake";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-24.05";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    nixpkgs,
    flake-utils,
    ...
  }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = import nixpkgs {inherit system;};
      nodejs = pkgs.nodejs_20;
      start-server = pkgs.writeShellScriptBin "start-server" ''cd $REPOSITORY_ROOT/pixelpact; npm run start'';
      start-server-docker = pkgs.writeShellScriptBin "start-server-docker" ''cd $REPOSITORY_ROOT/pixelpact; docker compose up --build'';
    in {
      devShells.default = pkgs.mkShellNoCC {
        buildInputs = with pkgs; [nodejs start-server start-server-docker];
        shellHook = ''
          export REPOSITORY_ROOT=$(pwd)
          playwright_chromium_revision="$(${pkgs.jq}/bin/jq --raw-output '.browsers[] | select(.name == "chromium").revision' ${pkgs.playwright-driver}/package/browsers.json)"
          export PLAYWRIGHT_CHROME_EXECUTABLE_PATH="${pkgs.playwright-driver.browsers}/chromium-$playwright_chromium_revision/chrome-linux/chrome";
          export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers}
          export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS
          ln -fs "$REPOSITORY_ROOT/bin/pre-commit" "$REPOSITORY_ROOT/.git/hooks/pre-commit"
        '';
      };

      formatter = pkgs.alejandra;
    });
}
