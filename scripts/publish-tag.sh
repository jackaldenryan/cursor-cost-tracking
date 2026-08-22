#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

version="$(node -p "require('./package.json').version")"
tauri_version="$(node -p "require('./src-tauri/tauri.conf.json').version")"
cargo_version="$(awk -F '"' '/^version = / { print $2; exit }' src-tauri/Cargo.toml)"

if [[ "$version" != "$tauri_version" || "$version" != "$cargo_version" ]]; then
  echo "Version mismatch: package.json=$version tauri.conf.json=$tauri_version Cargo.toml=$cargo_version"
  exit 1
fi

tag="v$version"
if git rev-parse "$tag" >/dev/null 2>&1; then
  echo "Tag $tag already exists."
  exit 1
fi

git tag "$tag"
git push origin "$tag"
echo "Pushed $tag. GitHub Actions will build the release."
