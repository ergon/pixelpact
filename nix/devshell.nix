{
  pkgs,
  config,
  ...
}: let
  repositoryRoot = config.git.root.shellVariable;
in {
  imports = [./playwright.nix];

  git.root.enable = true;
  playwright.enable = true;

  treefmt = {
    enable = true;
    pre-commit-hook = true;
    programs.alejandra.enable = true;
    programs.prettier.enable = true;
    programs.prettier.package = pkgs.prettier;
    settings.global.excludes = ["*-lock.json"];
  };

  packages = [pkgs.nodejs];

  scripts = {
    start-server.text = ''cd "${repositoryRoot}/server"; npm run start'';
    start-server-docker.text = ''cd "${repositoryRoot}/server"; docker compose up --build'';
  };
}
