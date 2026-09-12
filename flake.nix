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
      start-server = pkgs.writeShellScriptBin "start-server" ''cd $REPOSITORY_ROOT/pixelpact; npm run start'';
      start-server-docker = pkgs.writeShellScriptBin "start-server-docker" ''cd $REPOSITORY_ROOT/pixelpact; docker compose up --build'';
    in {
      devShells.default = pkgs.mkShellNoCC {
        buildInputs = [nodejs start-server start-server-docker];
        shellHook = ''
          export REPOSITORY_ROOT=$(pwd)
          export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
          export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=true
          ln -fs "$REPOSITORY_ROOT/bin/pre-commit" "$REPOSITORY_ROOT/.git/hooks/pre-commit"
        '';
      };

      formatter = pkgs.alejandra;
    });
}
