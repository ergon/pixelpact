{
  description = "Pixelpact Project Flake";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-22.11";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    nixpkgs,
    flake-utils,
    ...
  }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = import nixpkgs {inherit system;};
      nodejs = pkgs.nodejs-19_x;
      start-server = pkgs.writeShellScriptBin "start-server" ''cd $REPOSITORY_ROOT/pixelpact; npm run start'';
      start-server-docker = pkgs.writeShellScriptBin "start-server-docker" ''cd $REPOSITORY_ROOT/pixelpact; docker compose up --build'';
    in {
      devShell = pkgs.mkShellNoCC {
        buildInputs = with pkgs; [nodejs start-server start-server-docker];
        shellHook = ''
          export REPOSITORY_ROOT=$(pwd)
        '';

      };

      # enable formatting via `nix fmt`
      formatter = pkgs.alejandra; # or nixpkgs-fmt;
    });
}