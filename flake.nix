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
    in {
      devShell = pkgs.mkShellNoCC {
        buildInputs = with pkgs; [nodejs start-server];
        shellHook = ''
          export REPOSITORY_ROOT=$(pwd)
        '';

      };

      # enable formatting via `nix fmt`
      formatter = pkgs.alejandra; # or nixpkgs-fmt;
    });
}